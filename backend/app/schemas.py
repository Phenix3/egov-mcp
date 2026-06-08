"""
Modèles Pydantic partagés — inputs/outputs des 5 outils MCP + contrat /chat.
Ce fichier est la source de vérité des types ; le frontend doit refléter ces structures.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


# ===========================================================================
# Outil 1 — calculate_cnps_contributions
# ===========================================================================

class Employee(BaseModel):
    gross_salary: float = Field(..., gt=0, description="Salaire brut mensuel en XAF")
    sector_risk_group: Literal["A", "B", "C"] = Field(
        ..., description="Groupe de risque sectoriel (A=faible, B=moyen, C=élevé)"
    )


class CNPSInput(BaseModel):
    employees: list[Employee] = Field(..., min_length=1)


class CNPSContribution(BaseModel):
    index: int
    gross_salary: float
    capped_base: float
    old_age_pension_employee: float
    old_age_pension_employer: float
    family_allowances_employer: float
    work_injury_employer: float
    total_employee: float
    total_employer: float


class CNPSOutput(BaseModel):
    contributions: list[CNPSContribution]
    grand_total_employee: float
    grand_total_employer: float


# ===========================================================================
# Outil 2 — calculate_payroll_tax
# ===========================================================================

class PayrollTaxInput(BaseModel):
    gross_salary: float = Field(..., gt=0, description="Salaire brut mensuel en XAF")
    number_of_dependents: int = Field(0, ge=0, description="Nombre de personnes à charge")


class BracketDetail(BaseModel):
    lower: float
    upper: float | None
    rate: float
    amount: float


class PayrollTaxOutput(BaseModel):
    gross_salary: float
    taxable_base: float
    irpp: float
    other_withholdings: float
    net_salary: float
    bracket_details: list[BracketDetail]
    note: str | None = None   # avertissement si IRPP_BRACKETS non configurés


# ===========================================================================
# Outil 3 — calculate_vat
# ===========================================================================

class VATInput(BaseModel):
    amount_excl_tax: float = Field(..., ge=0, description="Montant hors taxe en XAF")
    rate: float | None = Field(
        None, gt=0, le=1, description="Taux TVA (ex. 0.1925). Si absent, utilise la valeur de config."
    )


class VATOutput(BaseModel):
    amount_excl_tax: float
    vat_rate: float
    vat_amount: float
    amount_incl_tax: float


# ===========================================================================
# Outil 4 — validate_registration_number
# ===========================================================================

class ValidationInput(BaseModel):
    number: str = Field(..., min_length=1)
    type: Literal["CNPS", "NIU"]


class ValidationOutput(BaseModel):
    valid: bool
    type: str
    normalized: str
    reason: str | None = None


# ===========================================================================
# Outil 5 — get_economic_indicator
# ===========================================================================

class IndicatorInput(BaseModel):
    indicator: str = Field(
        ...,
        min_length=1,
        description="Code indicateur Banque Mondiale (ex. NY.GDP.MKTP.CD)",
    )
    most_recent: int = Field(5, ge=1, le=50, description="Nombre de valeurs récentes à retourner")


class Observation(BaseModel):
    year: int
    value: float | None   # null possible dans l'API Banque Mondiale


class IndicatorOutput(BaseModel):
    indicator_code: str
    indicator_name: str
    country: str
    observations: list[Observation]
    source: str


# ===========================================================================
# Contrat /chat
# ===========================================================================

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    lang: Literal["fr", "en"] = "fr"


class ToolCallLog(BaseModel):
    tool: str
    arguments: dict[str, Any]
    result: dict[str, Any]
    latency_ms: int
    status: Literal["ok", "error"]


class StructuredResult(BaseModel):
    type: str   # ex. "cnps_table", "vat_summary", "indicator_chart", "validation_result"
    data: dict[str, Any]


class ChatResponse(BaseModel):
    reply: str
    tool_calls: list[ToolCallLog] = Field(default_factory=list)
    structured: StructuredResult | None = None
