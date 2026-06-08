"""Tests unitaires — calculate_payroll_tax."""
import pytest
from pydantic import ValidationError

from app.schemas import PayrollTaxInput
from app.tools.payroll_tax import calculate_payroll_tax
import app.config as config


def test_returns_note_when_brackets_empty(monkeypatch):
    monkeypatch.setattr(config, "IRPP_BRACKETS", [])
    result = calculate_payroll_tax(PayrollTaxInput(gross_salary=300_000))
    assert result.irpp == 0.0
    assert result.note is not None
    assert "IRPP_BRACKETS" in result.note


def test_taxable_base_lower_than_gross():
    result = calculate_payroll_tax(PayrollTaxInput(gross_salary=300_000))
    assert result.taxable_base < result.gross_salary


def test_net_salary_consistency():
    result = calculate_payroll_tax(PayrollTaxInput(gross_salary=300_000))
    assert result.net_salary == round(result.gross_salary - result.irpp - result.other_withholdings, 2)


def test_with_brackets(monkeypatch):
    monkeypatch.setattr(config, "IRPP_BRACKETS", [
        (0, 500_000, 0.10),
        (500_000, None, 0.20),
    ])
    result = calculate_payroll_tax(PayrollTaxInput(gross_salary=1_000_000))
    # base = 1M - 30% = 700k, irpp = 50k*0.1 + 200k*0.2 — check bracket_details populated
    assert len(result.bracket_details) > 0
    assert result.irpp > 0
    assert result.note is None


def test_negative_salary_raises():
    with pytest.raises(ValidationError):
        PayrollTaxInput(gross_salary=-1)
