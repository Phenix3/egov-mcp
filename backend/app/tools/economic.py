"""
Appel HTTP réel à l API Banque Mondiale — indicateurs économiques Cameroun.
URL : https://api.worldbank.org/v2/country/CMR/indicator/{CODE}?format=json&mrv=N
Pas de clé API requise.
"""
from __future__ import annotations

import httpx

from app.schemas import IndicatorInput, IndicatorOutput, Observation

_BASE_URL = "https://api.worldbank.org/v2/country/CMR/indicator"
_TIMEOUT = 10.0


def get_economic_indicator(data: IndicatorInput) -> IndicatorOutput:
    url = f"{_BASE_URL}/{data.indicator}"
    params = {"format": "json", "mrv": data.most_recent}

    response = httpx.get(url, params=params, timeout=_TIMEOUT)
    response.raise_for_status()

    raw = response.json()

    # Réponse = [metadata, [observations...]]
    if not isinstance(raw, list) or len(raw) < 2 or not isinstance(raw[1], list):
        return IndicatorOutput(
            indicator_code=data.indicator,
            indicator_name=data.indicator,
            country="Cameroon",
            observations=[],
            source="World Bank",
        )

    obs_raw: list[dict] = raw[1]
    indicator_name = data.indicator

    observations: list[Observation] = []
    for item in obs_raw:
        if not isinstance(item, dict):
            continue
        if indicator_name == data.indicator and "indicator" in item:
            indicator_name = item["indicator"].get("value", data.indicator)
        year_str = item.get("date", "")
        try:
            year = int(year_str)
        except (ValueError, TypeError):
            continue
        value = item.get("value")  # peut être None
        observations.append(Observation(year=year, value=value))

    # Tri chronologique descendant
    observations.sort(key=lambda o: o.year, reverse=True)

    return IndicatorOutput(
        indicator_code=data.indicator,
        indicator_name=indicator_name,
        country="Cameroon",
        observations=observations,
        source="World Bank",
    )
