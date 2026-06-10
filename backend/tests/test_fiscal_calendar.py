"""
Tests unitaires — get_fiscal_obligations (logique déterministe, pas d'appel réseau).
"""
import pytest
from app.schemas import FiscalObligationInput
from app.tools.fiscal_calendar import get_fiscal_obligations


def test_all_obligations_returns_list():
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="all"))
    assert result.count > 0
    assert len(result.obligations) == result.count
    assert result.obligation_type == "all"
    assert result.month is None


def test_filter_by_tva():
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="TVA"))
    for ob in result.obligations:
        assert ob.type == "TVA"


def test_filter_by_cnps():
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="CNPS"))
    for ob in result.obligations:
        assert ob.type == "CNPS"


def test_filter_by_month_monthly():
    # Les obligations mensuelles doivent apparaître quel que soit le mois
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="all", month=6))
    monthly = [o for o in result.obligations if o.frequency == "monthly"]
    assert len(monthly) > 0


def test_obligation_has_required_fields():
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="all"))
    for ob in result.obligations:
        assert ob.label
        assert ob.frequency in ("monthly", "quarterly", "annual")
        assert ob.deadline_description
        assert ob.applicable_to
        assert ob.legal_reference


def test_quarterly_is_not_in_non_deadline_month():
    # IS trimestriel : échéance mois 1, 4, 7, 10 — le mois 2 ne doit pas contenir d'IS trimestriel
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="IS", month=2))
    quarterly = [o for o in result.obligations if o.frequency == "quarterly"]
    assert len(quarterly) == 0


def test_is_quarterly_in_deadline_month():
    # Mois 4 (avril) = deadline IS trimestriel
    result = get_fiscal_obligations(FiscalObligationInput(obligation_type="IS", month=4))
    quarterly = [o for o in result.obligations if o.frequency == "quarterly"]
    assert len(quarterly) > 0
