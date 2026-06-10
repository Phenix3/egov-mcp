"""
Calendrier fiscal Cameroun — obligations et échéances.
Source : Code Général des Impôts (CGI) Cameroun + réglementation CNPS.
Logique 100 % déterministe — aucun appel réseau.
"""
from __future__ import annotations

from app.config import FISCAL_OBLIGATIONS
from app.schemas import FiscalObligationInput, FiscalObligationOutput, FiscalObligation


def get_fiscal_obligations(data: FiscalObligationInput) -> FiscalObligationOutput:
    obligations_raw = FISCAL_OBLIGATIONS

    # Filtre par type
    if data.obligation_type != "all":
        obligations_raw = [o for o in obligations_raw if o["type"] == data.obligation_type]

    # Filtre par mois : ne garde que les obligations dont l'échéance tombe ce mois-ci
    if data.month is not None:
        filtered = []
        for o in obligations_raw:
            if o["frequency"] == "monthly":
                # Toutes les obligations mensuelles ont une échéance chaque mois
                filtered.append(o)
            elif o["frequency"] == "quarterly":
                # Échéance les mois 1, 4, 7, 10 (premier mois du trimestre suivant)
                if data.month in o.get("deadline_months", []):
                    filtered.append(o)
            elif o["frequency"] == "annual":
                if data.month == o.get("deadline_month"):
                    filtered.append(o)
        obligations_raw = filtered

    result = []
    for o in obligations_raw:
        # Calcul de la prochaine échéance textuelle
        deadline_desc = _format_deadline(o, data.month)
        result.append(FiscalObligation(
            type=o["type"],
            label=o["label"],
            frequency=o["frequency"],
            deadline_description=deadline_desc,
            applicable_to=o["applicable_to"],
            legal_reference=o.get("legal_reference", ""),
        ))

    return FiscalObligationOutput(
        obligation_type=data.obligation_type,
        month=data.month,
        obligations=result,
        count=len(result),
    )


def _format_deadline(o: dict, month: int | None) -> str:
    day = o["deadline_day"]
    freq = o["frequency"]

    if freq == "monthly":
        return f"Le {day} du mois suivant"
    if freq == "quarterly":
        months = o.get("deadline_months", [])
        month_names = {1: "janvier", 4: "avril", 7: "juillet", 10: "octobre"}
        names = [month_names.get(m, str(m)) for m in months]
        return f"Le {day} de : {', '.join(names)}"
    if freq == "annual":
        dm = o.get("deadline_month", 3)
        month_names = {
            1: "janvier", 2: "février", 3: "mars", 4: "avril",
            5: "mai", 6: "juin", 7: "juillet", 8: "août",
            9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
        }
        return f"Le {day} {month_names.get(dm, str(dm))}"
    return f"Jour {day}"
