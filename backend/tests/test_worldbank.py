"""
Test d intégration — appel HTTP réel à l API Banque Mondiale.
Exclure du CI : pytest tests/ --ignore=tests/test_worldbank.py
"""
import pytest
from app.schemas import IndicatorInput
from app.tools.economic import get_economic_indicator


@pytest.mark.integration
def test_gdp_indicator_returns_observations():
    result = get_economic_indicator(IndicatorInput(indicator="NY.GDP.MKTP.CD", most_recent=3))
    assert result.country == "Cameroon"
    assert result.source == "World Bank"
    assert result.indicator_code == "NY.GDP.MKTP.CD"
    assert len(result.observations) > 0


@pytest.mark.integration
def test_inflation_indicator():
    result = get_economic_indicator(IndicatorInput(indicator="FP.CPI.TOTL.ZG", most_recent=3))
    assert result.indicator_name != "FP.CPI.TOTL.ZG"  # nom résolu depuis l API


@pytest.mark.integration
def test_null_values_handled():
    result = get_economic_indicator(IndicatorInput(indicator="NY.GDP.MKTP.CD", most_recent=5))
    # Toutes les observations ont un year valide même si value peut être None
    for obs in result.observations:
        assert isinstance(obs.year, int)


@pytest.mark.integration
def test_unknown_indicator_returns_empty():
    result = get_economic_indicator(IndicatorInput(indicator="XX.UNKNOWN.CODE", most_recent=3))
    assert isinstance(result.observations, list)
    assert len(result.observations) == 0
