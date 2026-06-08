"""Calcul TVA — logique pure."""
from __future__ import annotations

import app.config as config
from app.schemas import VATInput, VATOutput


def calculate_vat(data: VATInput) -> VATOutput:
    rate = data.rate if data.rate is not None else config.VAT_RATE
    vat_amount = round(data.amount_excl_tax * rate, 2)
    return VATOutput(
        amount_excl_tax=data.amount_excl_tax,
        vat_rate=rate,
        vat_amount=vat_amount,
        amount_incl_tax=round(data.amount_excl_tax + vat_amount, 2),
    )
