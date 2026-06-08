"""Validation de format de matricules CNPS / NIU — pas de lookup registre."""
from __future__ import annotations

import re

import app.config as config
from app.schemas import ValidationInput, ValidationOutput


def validate_registration_number(data: ValidationInput) -> ValidationOutput:
    pattern = config.CNPS_NUMBER_REGEX if data.type == "CNPS" else config.NIU_REGEX
    normalized = data.number.strip().upper()

    if re.fullmatch(pattern, normalized):
        return ValidationOutput(valid=True, type=data.type, normalized=normalized)

    reason = f"Format invalide pour {data.type}. Pattern attendu : {pattern}"
    return ValidationOutput(valid=False, type=data.type, normalized=normalized, reason=reason)
