"""
Serveur MCP — FastMCP, 6 outils, auth Bearer token, logging structuré.
Transport : Streamable HTTP stateless.
"""
from __future__ import annotations

import time

from mcp.server.fastmcp import FastMCP

from app.logging_conf import log_tool_call
from app.schemas import (
    CNPSInput,
    FiscalObligationInput,
    IndicatorInput,
    PayrollTaxInput,
    VATInput,
    ValidationInput,
)
from app.tools.cnps import calculate_cnps_contributions as _cnps
from app.tools.economic import get_economic_indicator as _economic
from app.tools.fiscal_calendar import get_fiscal_obligations as _fiscal
from app.tools.payroll_tax import calculate_payroll_tax as _payroll
from app.tools.validation import validate_registration_number as _validate
from app.tools.vat import calculate_vat as _vat


def build_mcp_server() -> FastMCP:
    mcp = FastMCP(
        "liwaza-egov",
        stateless_http=True,
        json_response=True,
    )

    @mcp.tool()
    def calculate_cnps_contributions(employees: list[dict]) -> dict:
        """
        Calcule les cotisations CNPS (Caisse Nationale de Prévoyance Sociale)
        pour une liste d employés. Retourne la part salariale et patronale
        détaillée par employé ainsi que les totaux.

        Chaque employé doit fournir :
        - gross_salary (float) : salaire brut mensuel en XAF
        - sector_risk_group (str) : A (risque faible), B (moyen), C (élevé)
        """
        t0 = time.monotonic()
        try:
            data = CNPSInput(employees=employees)
            result = _cnps(data)
            log_tool_call(tool="calculate_cnps_contributions", params={"count": len(employees)},
                          status="ok", latency_ms=int((time.monotonic() - t0) * 1000))
            return result.model_dump()
        except Exception as exc:
            log_tool_call(tool="calculate_cnps_contributions", params={"count": len(employees)},
                          status="error", latency_ms=int((time.monotonic() - t0) * 1000), error=str(exc))
            raise

    @mcp.tool()
    def calculate_payroll_tax(gross_salary: float, number_of_dependents: int = 0) -> dict:
        """
        Calcule l IRPP (Impôt sur le Revenu des Personnes Physiques) et les retenues
        salariales selon le barème CGI Cameroun.

        Paramètres :
        - gross_salary (float) : salaire brut mensuel en XAF
        - number_of_dependents (int) : nombre de personnes à charge (défaut 0)
        """
        t0 = time.monotonic()
        try:
            data = PayrollTaxInput(gross_salary=gross_salary, number_of_dependents=number_of_dependents)
            result = _payroll(data)
            log_tool_call(tool="calculate_payroll_tax", params={}, status="ok",
                          latency_ms=int((time.monotonic() - t0) * 1000))
            return result.model_dump()
        except Exception as exc:
            log_tool_call(tool="calculate_payroll_tax", params={}, status="error",
                          latency_ms=int((time.monotonic() - t0) * 1000), error=str(exc))
            raise

    @mcp.tool()
    def calculate_vat(amount_excl_tax: float, rate: float | None = None) -> dict:
        """
        Calcule la TVA (Taxe sur la Valeur Ajoutée) camerounaise.
        Le taux par défaut est défini dans config.py (19.25% — à confirmer DGI).

        Paramètres :
        - amount_excl_tax (float) : montant hors taxe en XAF
        - rate (float|None) : taux TVA optionnel (ex. 0.1925). Si absent, utilise la config.
        """
        t0 = time.monotonic()
        try:
            data = VATInput(amount_excl_tax=amount_excl_tax, rate=rate)
            result = _vat(data)
            log_tool_call(tool="calculate_vat", params={}, status="ok",
                          latency_ms=int((time.monotonic() - t0) * 1000))
            return result.model_dump()
        except Exception as exc:
            log_tool_call(tool="calculate_vat", params={}, status="error",
                          latency_ms=int((time.monotonic() - t0) * 1000), error=str(exc))
            raise

    @mcp.tool()
    def validate_registration_number(number: str, type: str) -> dict:
        """
        Valide le FORMAT d un matricule CNPS ou NIU (pas de lookup registre).
        Retourne valid, normalized, et la raison si invalide.

        Paramètres :
        - number (str) : matricule à valider
        - type (str) : "CNPS" ou "NIU"
        """
        t0 = time.monotonic()
        try:
            data = ValidationInput(number=number, type=type)
            result = _validate(data)
            log_tool_call(tool="validate_registration_number", params={"type": type},
                          status="ok", latency_ms=int((time.monotonic() - t0) * 1000))
            return result.model_dump()
        except Exception as exc:
            log_tool_call(tool="validate_registration_number", params={"type": type},
                          status="error", latency_ms=int((time.monotonic() - t0) * 1000), error=str(exc))
            raise

    @mcp.tool()
    def get_economic_indicator(indicator: str, most_recent: int = 10) -> dict:
        """
        Récupère un indicateur économique du Cameroun via l API Banque Mondiale.
        Appel HTTP réel — pas de données simulées. Aucune clé API requise.

        Codes utiles : NY.GDP.MKTP.CD (PIB), FP.CPI.TOTL.ZG (inflation),
        SP.POP.TOTL (population), NY.GDP.MKTP.KD.ZG (croissance PIB).

        Paramètres :
        - indicator (str) : code indicateur Banque Mondiale
        - most_recent (int) : nombre d observations récentes (défaut 10)
        """
        t0 = time.monotonic()
        try:
            data = IndicatorInput(indicator=indicator, most_recent=most_recent)
            result = _economic(data)
            log_tool_call(tool="get_economic_indicator", params={"indicator": indicator},
                          status="ok", latency_ms=int((time.monotonic() - t0) * 1000),
                          source="World Bank")
            return result.model_dump()
        except Exception as exc:
            log_tool_call(tool="get_economic_indicator", params={"indicator": indicator},
                          status="error", latency_ms=int((time.monotonic() - t0) * 1000), error=str(exc))
            raise

    @mcp.tool()
    def get_fiscal_obligations(obligation_type: str = "all", month: int | None = None) -> dict:
        """
        Retourne les obligations fiscales et sociales camerounaises avec leurs échéances.
        Source : CGI Cameroun + réglementation CNPS. Calcul déterministe — pas d appel réseau.

        Paramètres :
        - obligation_type (str) : "TVA", "IRPP", "IS", "CNPS", "DSF" ou "all" (défaut)
        - month (int|None) : mois 1-12 pour filtrer les obligations du mois
        """
        t0 = time.monotonic()
        try:
            data = FiscalObligationInput(obligation_type=obligation_type, month=month)
            result = _fiscal(data)
            log_tool_call(tool="get_fiscal_obligations",
                          params={"obligation_type": obligation_type, "month": month},
                          status="ok", latency_ms=int((time.monotonic() - t0) * 1000))
            return result.model_dump()
        except Exception as exc:
            log_tool_call(tool="get_fiscal_obligations",
                          params={"obligation_type": obligation_type, "month": month},
                          status="error", latency_ms=int((time.monotonic() - t0) * 1000), error=str(exc))
            raise

    return mcp
