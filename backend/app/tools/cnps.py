"""
Moteur de calcul CNPS — logique pure, sans framework.
Sources : cnps.cm, décret 2016, projecteurmagazine.cm (jan. 2026).
"""
from __future__ import annotations

import app.config as config
from app.schemas import CNPSContribution, CNPSInput, CNPSOutput


def calculate_cnps_contributions(data: CNPSInput) -> CNPSOutput:
    contributions: list[CNPSContribution] = []

    for idx, emp in enumerate(data.employees):
        base = min(emp.gross_salary, config.CNPS_CEILING_XAF)
        base = max(base, config.CNPS_SMIG_XAF)

        pension_employee = round(base * config.CNPS_PENSION_EMPLOYEE_RATE, 2)
        pension_employer = round(base * config.CNPS_PENSION_EMPLOYER_RATE, 2)
        family = round(base * config.CNPS_FAMILY_ALLOWANCES_RATE, 2)
        injury_rate = config.CNPS_WORK_INJURY_RATES[emp.sector_risk_group]
        injury = round(base * injury_rate, 2)

        total_employee = pension_employee
        total_employer = round(pension_employer + family + injury, 2)

        contributions.append(
            CNPSContribution(
                index=idx,
                gross_salary=emp.gross_salary,
                capped_base=base,
                old_age_pension_employee=pension_employee,
                old_age_pension_employer=pension_employer,
                family_allowances_employer=family,
                work_injury_employer=injury,
                total_employee=total_employee,
                total_employer=total_employer,
            )
        )

    grand_employee = round(sum(c.total_employee for c in contributions), 2)
    grand_employer = round(sum(c.total_employer for c in contributions), 2)

    return CNPSOutput(
        contributions=contributions,
        grand_total_employee=grand_employee,
        grand_total_employer=grand_employer,
    )
