"""
Tests d intégration — endpoint /chat avec LLM mocké.
Le fournisseur LLM est remplacé par un mock qui simule un tool_call.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.config as config


@pytest.fixture
def client(monkeypatch):
    from app.provider import LLMResponse

    class MockProvider:
        def complete(self, messages, tools=None):
            if tools and not any(m.get("role") == "tool" for m in messages):
                return LLMResponse(
                    content="",
                    tool_calls=[{"id": "tc1", "name": "calculate_vat", "arguments": {"amount_excl_tax": 500_000}}],
                )
            return LLMResponse(content="La TVA sur 500 000 XAF est de 96 250 XAF.", tool_calls=[])

        def build_tool_result_messages(self, messages, assistant_response, tool_results):
            result_msgs = [{"role": "tool", "content": str(tr["result"]), "tool_call_id": tr["id"]} for tr in tool_results]
            return messages + result_msgs

    import app.orchestrator as orch
    monkeypatch.setattr(orch, "get_provider", lambda: MockProvider())

    from app.main import app
    return TestClient(app)


def test_chat_returns_reply(client):
    resp = client.post("/chat", json={
        "messages": [{"role": "user", "content": "Calcule la TVA sur 500000 XAF"}],
        "lang": "fr",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data
    assert isinstance(data["tool_calls"], list)
    assert len(data["tool_calls"]) == 1
    assert data["tool_calls"][0]["tool"] == "calculate_vat"
    assert data["tool_calls"][0]["status"] == "ok"


def test_chat_structured_result(client):
    resp = client.post("/chat", json={
        "messages": [{"role": "user", "content": "Calcule la TVA sur 500000 XAF"}],
        "lang": "fr",
    })
    data = resp.json()
    assert data["structured"] is not None
    assert data["structured"]["type"] == "vat_summary"


def test_health():
    from app.main import app
    c = TestClient(app)
    resp = c.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
