"""Tests unitaires — validate_registration_number."""
import pytest
from app.schemas import ValidationInput
from app.tools.validation import validate_registration_number
import app.config as config


def test_valid_cnps(monkeypatch):
    monkeypatch.setattr(config, "CNPS_NUMBER_REGEX", r"^\d{10}$")
    result = validate_registration_number(ValidationInput(number="1234567890", type="CNPS"))
    assert result.valid is True
    assert result.reason is None


def test_invalid_cnps_too_short(monkeypatch):
    monkeypatch.setattr(config, "CNPS_NUMBER_REGEX", r"^\d{10}$")
    result = validate_registration_number(ValidationInput(number="123", type="CNPS"))
    assert result.valid is False
    assert result.reason is not None


def test_valid_niu(monkeypatch):
    monkeypatch.setattr(config, "NIU_REGEX", r"^[A-Z]\d{9}[A-Z0-9]$")
    result = validate_registration_number(ValidationInput(number="M123456789A", type="NIU"))
    assert result.valid is True


def test_invalid_niu(monkeypatch):
    monkeypatch.setattr(config, "NIU_REGEX", r"^[A-Z]\d{9}[A-Z0-9]$")
    result = validate_registration_number(ValidationInput(number="INVALID", type="NIU"))
    assert result.valid is False


def test_normalization_lowercase_input(monkeypatch):
    monkeypatch.setattr(config, "CNPS_NUMBER_REGEX", r"^\d{10}$")
    result = validate_registration_number(ValidationInput(number="1234567890", type="CNPS"))
    assert result.normalized == "1234567890"
