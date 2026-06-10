"""
Orchestrateur LLM — boucle tool-calling, dispatching, construction de ChatResponse.
Le LLM tourne côté backend (clé jamais côté client). Les outils sont appelés
in-process (pas de round-trip HTTP interne).
"""
from __future__ import annotations

import json as _json
import re
import time
from typing import Any

from app.logging_conf import log_tool_call
from app.provider import LLMResponse, LLMProvider, get_provider
from app.schemas import (
    ChatRequest,
    ChatResponse,
    CNPSInput,
    FiscalObligationInput,
    IndicatorInput,
    PayrollTaxInput,
    StructuredResult,
    ToolCallLog,
    VATInput,
    ValidationInput,
)
from app.tools.cnps import calculate_cnps_contributions
from app.tools.economic import get_economic_indicator
from app.tools.fiscal_calendar import get_fiscal_obligations
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
        "description": (
            "Récupère un indicateur économique du Cameroun via l'API Banque Mondiale (données officielles réelles). "
            "Utiliser pour : PIB (NY.GDP.MKTP.CD), inflation (FP.CPI.TOTL.ZG), population (SP.POP.TOTL), "
            "croissance (NY.GDP.MKTP.KD.ZG), et autres indicateurs macroéconomiques."
        ),
        "parameters": IndicatorInput.model_json_schema(),
    },
    {
        "name": "get_fiscal_obligations",
        "description": (
            "Retourne les obligations fiscales et sociales camerounaises avec leurs échéances. "
            "Utiliser pour : connaître les délais de déclaration TVA/IRPP/IS/CNPS/DSF, "
            "vérifier les échéances fiscales d un mois donné, lister les obligations d une entreprise."
        ),
        "parameters": FiscalObligationInput.model_json_schema(),
    },
]

_DISPATCH: dict[str, Any] = {
    "calculate_cnps_contributions": lambda args: calculate_cnps_contributions(CNPSInput(**args)).model_dump(),
    "calculate_payroll_tax": lambda args: calculate_payroll_tax(PayrollTaxInput(**args)).model_dump(),
    "calculate_vat": lambda args: calculate_vat(VATInput(**args)).model_dump(),
    "validate_registration_number": lambda args: validate_registration_number(ValidationInput(**args)).model_dump(),
    "get_economic_indicator": lambda args: get_economic_indicator(IndicatorInput(**args)).model_dump(),
    "get_fiscal_obligations": lambda args: get_fiscal_obligations(FiscalObligationInput(**args)).model_dump(),
}

def _extract_think(text: str) -> tuple[str, str | None]:
    """Extrait les blocs <think>...</think> des modèles de raisonnement.
    Retourne (texte_sans_think, contenu_think_joint | None).
    """
    blocks = re.findall(r"<think>(.*?)</think>", text, flags=re.DOTALL)
    clean = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    thinking = "\n\n".join(b.strip() for b in blocks) if blocks else None
    return clean, thinking


_SYSTEM_PROMPT = """Tu es Liwaza, un assistant fiscal et social spécialisé pour les PME camerounaises.

━━ DEVISE — RÈGLE ABSOLUE ━━
• Toutes les sommes fiscales et salariales sont en XAF (Franc CFA BEAC).
• Format d'affichage obligatoire : chiffres séparés par des espaces + « XAF »
  Exemples : 450 000 XAF · 1 250 750 XAF (Franc CFA BEAC) · 36 270 XAF (Franc CFA BEAC)
• NE JAMAIS convertir les devises toi-même. L'interface se charge de l'affichage.
• Pour les indicateurs Banque Mondiale (ex. PIB NY.GDP.MKTP.CD) : les données sont
  en USD dans la réponse de l'outil — NE PAS les convertir manuellement.
  L'interface convertit automatiquement en XAF via la parité fixe BEAC (1 USD = 655,957 XAF).
  Commente simplement : « Données Banque Mondiale — affichées en XAF par l'interface. »
• Ne jamais mentionner des valeurs en USD, EUR ou autre devise dans tes réponses textuelles.

━━ MISSION ━━
Tu réponds en {lang}. Tu utilises les outils disponibles pour :
- Calculer les cotisations CNPS (pension, AT/MP, allocations familiales) en XAF
- Calculer l'IRPP et les retenues salariales camerounaises en XAF
- Calculer la TVA camerounaise (19,25 % = 17,5 % TVA + 10 % CAC) en XAF
- Valider le format des matricules CNPS et NIU
- Consulter le calendrier des obligations fiscales (TVA, IRPP, IS, CNPS, DSF)
- Récupérer des indicateurs économiques du Cameroun (PIB, inflation, population…)

━━ RÈGLES DE COMPORTEMENT ━━
• Tu ne devines JAMAIS un résultat fiscal — tu appelles systématiquement l'outil approprié.
• Si une information manque (ex. groupe de risque CNPS non précisé), tu la demandes avant de calculer.
• Tes réponses sont précises, structurées et directement exploitables par un comptable ou un gérant de PME.
• Tu cites les références réglementaires pertinentes (CGI Cameroun, Code du Travail, décrets CNPS).
• Tu n'inventes aucun endpoint gouvernemental — seule l'API Banque Mondiale est utilisée pour les données externes."""


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
        "get_fiscal_obligations": "fiscal_obligations",
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
        final_reply, thinking = _extract_think(response2.content)
    else:
        final_reply, thinking = _extract_think(response1.content)

    return ChatResponse(
        reply=final_reply,
        tool_calls=tool_calls_log,
        structured=_build_structured(tool_calls_log),
        thinking=thinking if request.show_thinking else None,
    )


