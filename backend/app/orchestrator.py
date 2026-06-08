"""
Orchestrateur LLM — boucle tool-calling, dispatching, construction de ChatResponse.
Le LLM tourne côté backend (clé jamais côté client). Les outils sont appelés
in-process (pas de round-trip HTTP interne).
"""
from __future__ import annotations

import json as _json
import time
from typing import Any

from app.logging_conf import log_tool_call
from app.provider import LLMResponse, LLMProvider, get_provider
from app.schemas import (
    ChatRequest,
    ChatResponse,
    CNPSInput,
    IndicatorInput,
    PayrollTaxInput,
    StructuredResult,
    ToolCallLog,
    VATInput,
    ValidationInput,
)
from app.tools.cnps import calculate_cnps_contributions
from app.tools.economic import get_economic_indicator
from app.tools.payroll_tax import calculate_payroll_tax
from app.tools.validation import validate_registration_number
from app.tools.vat import calculate_vat

# ---------------------------------------------------------------------------
# Définitions des outils (JSON Schema pour le LLM)
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "calculate_cnps_contributions",
        "description": "Calcule les cotisations CNPS pour une liste d employés (salaire brut, groupe de risque).",
        "parameters": CNPSInput.model_json_schema(),
    },
    {
        "name": "calculate_payroll_tax",
        "description": "Calcule l IRPP et les retenues salariales camerounaises sur un salaire brut.",
        "parameters": PayrollTaxInput.model_json_schema(),
    },
    {
        "name": "calculate_vat",
        "description": "Calcule la TVA camerounaise sur un montant hors taxe.",
        "parameters": VATInput.model_json_schema(),
    },
    {
        "name": "validate_registration_number",
        "description": "Valide le format d un matricule CNPS ou NIU (pas de lookup registre).",
        "parameters": ValidationInput.model_json_schema(),
    },
    {
        "name": "get_economic_indicator",
        "description": "Récupère un indicateur économique Cameroun depuis l API Banque Mondiale (PIB, inflation, etc.).",
        "parameters": IndicatorInput.model_json_schema(),
    },
]

_DISPATCH: dict[str, Any] = {
    "calculate_cnps_contributions": lambda args: calculate_cnps_contributions(CNPSInput(**args)).model_dump(),
    "calculate_payroll_tax": lambda args: calculate_payroll_tax(PayrollTaxInput(**args)).model_dump(),
    "calculate_vat": lambda args: calculate_vat(VATInput(**args)).model_dump(),
    "validate_registration_number": lambda args: validate_registration_number(ValidationInput(**args)).model_dump(),
    "get_economic_indicator": lambda args: get_economic_indicator(IndicatorInput(**args)).model_dump(),
}

_SYSTEM_PROMPT = """Tu es un assistant fiscal et social pour PME camerounaises.
Tu réponds en {lang}. Tu utilises les outils disponibles pour calculer cotisations,
impôts et indicateurs économiques. Tu ne devines jamais un résultat — tu appelles
toujours l outil approprié. Tes réponses sont précises, structurées et exploitables."""


def _build_structured(tool_calls_log: list[ToolCallLog]) -> StructuredResult | None:
    if not tool_calls_log:
        return None
    last = tool_calls_log[-1]
    type_map = {
        "calculate_cnps_contributions": "cnps_table",
        "calculate_payroll_tax": "payroll_tax_summary",
        "calculate_vat": "vat_summary",
        "validate_registration_number": "validation_result",
        "get_economic_indicator": "indicator_chart",
    }
    return StructuredResult(
        type=type_map.get(last.tool, "generic"),
        data=last.result,
    )


async def orchestrate(request: ChatRequest) -> ChatResponse:
    provider: LLMProvider = get_provider()
    lang = request.lang

    system_content = _SYSTEM_PROMPT.format(lang="français" if lang == "fr" else "english")
    messages = [{"role": "system", "content": system_content}] + [
        {"role": m.role, "content": m.content} for m in request.messages
    ]

    # --- Premier appel LLM ---
    response1: LLMResponse = provider.complete(messages, TOOL_DEFINITIONS)

    tool_calls_log: list[ToolCallLog] = []

    if response1.tool_calls:
        # Exécuter chaque outil
        tool_results = []
        for tc in response1.tool_calls:
            # Normalise arguments : certains providers renvoient une string JSON
            args = tc["arguments"]
            if isinstance(args, str):
                try:
                    args = _json.loads(args)
                except Exception:
                    args = {}
            tc = {**tc, "arguments": args}

            t0 = time.monotonic()
            try:
                fn = _DISPATCH.get(tc["name"])
                if fn is None:
                    raise ValueError(f"Outil inconnu : {tc['name']}")
                result = fn(tc["arguments"])
                status = "ok"
                error_msg = None
            except Exception as exc:
                result = {"error": str(exc)}
                status = "error"
                error_msg = str(exc)

            latency_ms = int((time.monotonic() - t0) * 1000)
            log_tool_call(
                tool=tc["name"],
                params=tc["arguments"],
                status=status,
                latency_ms=latency_ms,
                source="orchestrator",
                error=error_msg,
            )
            tool_calls_log.append(ToolCallLog(
                tool=tc["name"],
                arguments=tc["arguments"],
                result=result,
                latency_ms=latency_ms,
                status=status,
            ))
            tool_results.append({"id": tc["id"], "result": result})

        # --- Second appel LLM avec résultats ---
        messages2 = provider.build_tool_result_messages(messages, response1, tool_results)
        response2: LLMResponse = provider.complete(messages2)
        final_reply = response2.content
    else:
        final_reply = response1.content

    return ChatResponse(
        reply=final_reply,
        tool_calls=tool_calls_log,
        structured=_build_structured(tool_calls_log),
    )

