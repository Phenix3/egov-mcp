"""
Moteur IRPP + retenues salariales — logique pure.
ATTENTION : IRPP_BRACKETS doit être rempli depuis le CGI/DGI Cameroun avant utilisation.
"""
from __future__ import annotations

import app.config as config
from app.schemas import BracketDetail, PayrollTaxInput, PayrollTaxOutput


def _apply_brackets(amount: float) -> tuple[float, list[BracketDetail]]:
    """Applique le barème progressif IRPP. Retourne (irpp_total, détails)."""
    if not config.IRPP_BRACKETS:
        return 0.0, []

    details: list[BracketDetail] = []
    total = 0.0

    for lower, upper, rate in config.IRPP_BRACKETS:
        if amount <= lower:
            break
        taxable = (min(amount, upper) if upper is not None else amount) - lower
        if taxable <= 0:
            continue
        chunk = round(taxable * rate, 2)
        total += chunk
        details.append(BracketDetail(lower=lower, upper=upper, rate=rate, amount=chunk))

    return round(total, 2), details


def calculate_payroll_tax(data: PayrollTaxInput) -> PayrollTaxOutput:
    # Déduction forfaitaire frais professionnels
    deduction = data.gross_salary * config.IRPP_PROFESSIONAL_EXPENSES_RATE
    if config.IRPP_PROFESSIONAL_EXPENSES_CAP is not None:
        deduction = min(deduction, config.IRPP_PROFESSIONAL_EXPENSES_CAP)

    taxable_base = max(0.0, round(data.gross_salary - deduction, 2))

    irpp, bracket_details = _apply_brackets(taxable_base)

    # Autres retenues : placeholder — À compléter depuis CGI
    other_withholdings = 0.0

    net_salary = round(data.gross_salary - irpp - other_withholdings, 2)

    note = None
    if not config.IRPP_BRACKETS:
        note = "IRPP_BRACKETS non configuré — IRPP retourné à 0. Remplir config.py depuis le CGI/DGI Cameroun."

    return PayrollTaxOutput(
        gross_salary=data.gross_salary,
        taxable_base=taxable_base,
        irpp=irpp,
        other_withholdings=other_withholdings,
        net_salary=net_salary,
        bracket_details=bracket_details,
        note=note,
    )
