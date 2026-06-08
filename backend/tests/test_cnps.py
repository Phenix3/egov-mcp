"""Tests unitaires — calculate_cnps_contributions."""
import pytest
from pydantic import ValidationError

from app.schemas import CNPSInput, Employee
from app.tools.cnps import calculate_cnps_contributions
import app.config as config


def _make_input(salary: float, group: str = "A") -> CNPSInput:
    return CNPSInput(employees=[Employee(gross_salary=salary, sector_risk_group=group)])


def test_basic_group_a():
    result = calculate_cnps_contributions(_make_input(200_000, "A"))
    c = result.contributions[0]
    assert c.capped_base == 200_000.0
    assert c.old_age_pension_employee == round(200_000 * 0.042, 2)
    assert c.old_age_pension_employer == round(200_000 * 0.042, 2)
    assert c.family_allowances_employer == round(200_000 * 0.07, 2)
    assert c.work_injury_employer == round(200_000 * 0.0175, 2)


def test_salary_above_ceiling_is_capped():
    result = calculate_cnps_contributions(_make_input(1_000_000, "B"))
    c = result.contributions[0]
    assert c.capped_base == config.CNPS_CEILING_XAF
    assert c.old_age_pension_employee == round(config.CNPS_CEILING_XAF * 0.042, 2)


def test_salary_below_smig_uses_smig():
    result = calculate_cnps_contributions(_make_input(10_000, "A"))
    c = result.contributions[0]
    assert c.capped_base == config.CNPS_SMIG_XAF


def test_group_b_injury_rate():
    result = calculate_cnps_contributions(_make_input(200_000, "B"))
    c = result.contributions[0]
    assert c.work_injury_employer == round(200_000 * 0.025, 2)


def test_group_c_injury_rate():
    result = calculate_cnps_contributions(_make_input(200_000, "C"))
    c = result.contributions[0]
    assert c.work_injury_employer == round(200_000 * 0.05, 2)


def test_multiple_employees_grand_total():
    data = CNPSInput(employees=[
        Employee(gross_salary=100_000, sector_risk_group="A"),
        Employee(gross_salary=300_000, sector_risk_group="B"),
    ])
    result = calculate_cnps_contributions(data)
    assert len(result.contributions) == 2
    expected = sum(c.total_employee for c in result.contributions)
    assert result.grand_total_employee == round(expected, 2)


def test_negative_salary_raises():
    with pytest.raises(ValidationError):
        _make_input(-1)


def test_empty_employees_raises():
    with pytest.raises(ValidationError):
        CNPSInput(employees=[])
