"""Tests unitaires — calculate_vat."""
import pytest
from pydantic import ValidationError

from app.schemas import VATInput
from app.tools.vat import calculate_vat
import app.config as config


def test_default_rate():
    result = calculate_vat(VATInput(amount_excl_tax=100_000))
    assert result.vat_rate == config.VAT_RATE
    assert result.vat_amount == round(100_000 * config.VAT_RATE, 2)
    assert result.amount_incl_tax == round(100_000 + result.vat_amount, 2)


def test_custom_rate():
    result = calculate_vat(VATInput(amount_excl_tax=100_000, rate=0.20))
    assert result.vat_rate == 0.20
    assert result.vat_amount == round(100_000 * 0.20, 2)


def test_zero_amount():
    result = calculate_vat(VATInput(amount_excl_tax=0))
    assert result.vat_amount == 0.0
    assert result.amount_incl_tax == 0.0


def test_negative_amount_raises():
    with pytest.raises(ValidationError):
        VATInput(amount_excl_tax=-1)
