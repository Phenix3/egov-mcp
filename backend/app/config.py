"""
Configuration centrale — toutes les constantes fiscales et variables d'environnement.
Les valeurs marquées TODO doivent être confirmées sur la source officielle avant déploiement.
"""
from __future__ import annotations

import os

# ---------------------------------------------------------------------------
# CNPS — Caisse Nationale de Prévoyance Sociale  ✅ VÉRIFIÉS (cnps.cm / décret 2016)
# ---------------------------------------------------------------------------
CNPS_PENSION_EMPLOYEE_RATE: float = 0.042   # pension vieillesse, part salariale
CNPS_PENSION_EMPLOYER_RATE: float = 0.042   # pension vieillesse, part patronale
CNPS_FAMILY_ALLOWANCES_RATE: float = 0.07   # allocations familiales, employeur uniquement
CNPS_WORK_INJURY_RATES: dict[str, float] = {
    "A": 0.0175,  # risque faible
    "B": 0.025,   # risque moyen
    "C": 0.05,    # risque élevé
}
# TODO: confirmer le plafond exact sur cnps.cm (sources divergentes 300k vs 750k — décret 2016)
CNPS_CEILING_XAF: float = 750_000.0

# TODO: confirmer le SMIG en vigueur sur le Journal Officiel
CNPS_SMIG_XAF: float = 36_270.0

# ---------------------------------------------------------------------------
# IRPP — Impôt sur le Revenu des Personnes Physiques
# TODO: remplir IRPP_BRACKETS depuis le CGI Cameroun (DGI) avant déploiement
# Format : liste de (borne_inférieure, borne_supérieure_ou_None, taux)
# ---------------------------------------------------------------------------
IRPP_BRACKETS: list[tuple[float, float | None, float]] = [
    # (lower_bound_inclusive, upper_bound_exclusive_or_None, rate)
    # PLACEHOLDER — À COMPLÉTER depuis le CGI/DGI Cameroun
    # Exemple de structure (valeurs non vérifiées, NE PAS utiliser en production) :
    # (0,        2_000_000, 0.10),
    # (2_000_000, 3_000_000, 0.165),
    # (3_000_000, 5_000_000, 0.275),
    # (5_000_000, None,      0.385),
]

# Déduction forfaitaire frais professionnels
# TODO: confirmer sur CGI Cameroun
IRPP_PROFESSIONAL_EXPENSES_RATE: float = 0.30   # PLACEHOLDER
IRPP_PROFESSIONAL_EXPENSES_CAP: float | None = None

# ---------------------------------------------------------------------------
# TVA — Taxe sur la Valeur Ajoutée
# TODO: confirmer sur DGI Cameroun (17.5% base + 10% CAC = 19.25% effectif)
# ---------------------------------------------------------------------------
VAT_RATE: float = 0.1925

# ---------------------------------------------------------------------------
# Validation matricules
# TODO: confirmer les patterns exacts sur les docs officiels CNPS / DGI
# ---------------------------------------------------------------------------
CNPS_NUMBER_REGEX: str = r"^\d{10}$"            # PLACEHOLDER — 10 chiffres
NIU_REGEX: str = r"^[A-Z]\d{9}[A-Z0-9]$"       # PLACEHOLDER

# ---------------------------------------------------------------------------
# LLM — sélection par variable d'environnement
# ---------------------------------------------------------------------------
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic")
LLM_MODEL: str = os.getenv("LLM_MODEL", "claude-sonnet-4-6")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
K2_API_KEY: str = os.getenv("K2_API_KEY", "")
K2_BASE_URL: str = os.getenv("K2_BASE_URL", "https://api.k2think.ai/v1")
K2_DEFAULT_MODEL: str = "MBZUAI-IFM/K2-Think-v2"

# ---------------------------------------------------------------------------
# MCP
# ---------------------------------------------------------------------------
MCP_AUTH_TOKEN: str = os.getenv("MCP_AUTH_TOKEN", "")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
