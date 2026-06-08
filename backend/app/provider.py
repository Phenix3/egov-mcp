"""
Couche d abstraction fournisseur LLM.
Sélection via LLM_PROVIDER=anthropic|openai|k2think dans .env.
K2Think utilise le même SDK OpenAI avec une base_url différente.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import app.config as config


@dataclass
class LLMResponse:
    content: str
    tool_calls: list[dict] = field(default_factory=list)
    # [{"id": str, "name": str, "arguments": dict}]


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> LLMResponse:
        """Un seul appel LLM. Retourne contenu NL + éventuels tool_calls."""
        pass

    @abstractmethod
    def build_tool_result_messages(
        self,
        messages: list[dict],
        assistant_response: LLMResponse,
        tool_results: list[dict],
    ) -> list[dict]:
        """Construit la liste de messages pour le second tour (résultats d outils)."""
        pass


# ---------------------------------------------------------------------------
# Adaptateur Anthropic
# ---------------------------------------------------------------------------

class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        from anthropic import Anthropic  # import lazy
        self._client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
        self._model = config.LLM_MODEL or "claude-sonnet-4-6"

    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> LLMResponse:
        kwargs: dict = {"model": self._model, "max_tokens": 4096, "messages": messages}
        if tools:
            kwargs["tools"] = [
                {"name": t["name"], "description": t["description"], "input_schema": t["parameters"]}
                for t in tools
            ]
        response = self._client.messages.create(**kwargs)

        content_text = ""
        tool_calls = []
        for block in response.content:
            if hasattr(block, "type"):
                if block.type == "tool_use":
                    tool_calls.append({"id": block.id, "name": block.name, "arguments": block.input})
                elif block.type == "text":
                    content_text += block.text

        return LLMResponse(content=content_text, tool_calls=tool_calls)

    def build_tool_result_messages(self, messages, assistant_response, tool_results):
        # Reconstruit le message assistant avec les blocs tool_use
        assistant_msg: dict = {"role": "assistant", "content": []}
        if assistant_response.content:
            assistant_msg["content"].append({"type": "text", "text": assistant_response.content})
        for tc in assistant_response.tool_calls:
            assistant_msg["content"].append({"type": "tool_use", "id": tc["id"], "name": tc["name"], "input": tc["arguments"]})

        result_msg: dict = {"role": "user", "content": []}
        for tr in tool_results:
            result_msg["content"].append({
                "type": "tool_result",
                "tool_use_id": tr["id"],
                "content": json.dumps(tr["result"], default=str),
            })

        return messages + [assistant_msg, result_msg]


# ---------------------------------------------------------------------------
# Adaptateur OpenAI (et K2Think qui en hérite)
# ---------------------------------------------------------------------------

class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        from openai import OpenAI  # import lazy
        self._client = OpenAI(api_key=config.OPENAI_API_KEY)
        self._model = config.LLM_MODEL or "gpt-4o"

    def complete(self, messages: list[dict], tools: list[dict] | None = None) -> LLMResponse:
        kwargs: dict = {"model": self._model, "messages": messages}
        if tools:
            kwargs["tools"] = [
                {"type": "function", "function": {"name": t["name"], "description": t["description"], "parameters": t["parameters"]}}
                for t in tools
            ]
            kwargs["tool_choice"] = "auto"

        from openai import OpenAI
        response = self._client.chat.completions.create(**kwargs)
        msg = response.choices[0].message

        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments or "{}"),
                })

        return LLMResponse(content=msg.content or "", tool_calls=tool_calls)

    def build_tool_result_messages(self, messages, assistant_response, tool_results):
        assistant_msg = {
            "role": "assistant",
            "content": assistant_response.content or None,
            "tool_calls": [
                {"id": tc["id"], "type": "function", "function": {"name": tc["name"], "arguments": json.dumps(tc["arguments"])}}
                for tc in assistant_response.tool_calls
            ] or None,
        }
        result_msgs = [
            {"role": "tool", "tool_call_id": tr["id"], "content": json.dumps(tr["result"], default=str)}
            for tr in tool_results
        ]
        return messages + [assistant_msg] + result_msgs


class K2ThinkProvider(OpenAIProvider):
    def __init__(self) -> None:
        from openai import OpenAI
        self._client = OpenAI(
            api_key=config.K2_API_KEY,
            base_url=config.K2_BASE_URL,
        )
        self._model = config.LLM_MODEL or config.K2_DEFAULT_MODEL


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_provider() -> LLMProvider:
    match config.LLM_PROVIDER:
        case "openai":
            return OpenAIProvider()
        case "k2think":
            return K2ThinkProvider()
        case _:
            return AnthropicProvider()
