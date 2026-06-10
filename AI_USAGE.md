# AI_USAGE.md — Journal de divulgation IA

> **Obligatoire pour la soumission.** Tenir ce journal à jour en continu.
> Ne pas remplir à la dernière minute — les évaluateurs vérifient la cohérence avec git log.

---

## Outils IA utilisés

| Outil | Rôle |
|---|---|
| **Claude Code (claude-sonnet-4-6)** | Backend : schémas Pydantic, 5 outils MCP, orchestrateur, tests, Docker, CI |
| **Antigravity (Gemini)** | Frontend : UI conversationnelle, design system, vérification navigateur |
| *(autres à ajouter)* | |

---

## Parties assistées par IA vs écrites manuellement

| Composant | Assisté par IA | Manuel |
|---|---|---|
| `backend/app/schemas.py` | Structure générée par Claude Code | Validation des types, annotation `À VÉRIFIER` |
| `backend/app/config.py` | Structure et constantes vérifiées | Confirmation taux CNPS sur cnps.cm |
| `backend/app/tools/cnps.py` | Logique générée | Vérification calculs manuels avec exemples réels |
| `backend/app/tools/economic.py` | Appel HTTP + parser | Test appel réel Banque Mondiale |
| `backend/app/provider.py` | 3 adaptateurs LLM | Décision architecture hybride |
| `backend/app/orchestrator.py` | Boucle tool-calling | Décision : orchestrateur côté serveur |
| Frontend | Antigravity | Maquettes décidées manuellement |
| `docs/ARCHITECTURE.md` | Brouillon assisté | Réécrit et finalisé — note brouillon retirée |
| `docs/AI_STRATEGY.md` | Brouillon assisté | Finalisé — K2Think comme défaut MVP documenté |
| `backend/app/config.py` (IRPP) | Tranches commentées | Activées — barème CGI 4 tranches, TODO confirmé |

---

## Prompts utilisés

> Coller les prompts ici au fil de l eau. Ne pas reconstituer à la fin.

### Session 1 — 2026-06-08

**Prompt → Claude Code :**
```
Tu construis le backend d une plateforme eGov AI-native pour PME camerounaises.
Stack imposée : Python, FastAPI, Pydantic, SDK MCP officiel (FastMCP) en transport
Streamable HTTP, stateless. [...]
```

*(Ajouter les prompts suivants ici)*

---

## Vérifications effectuées

- [ ] Taux CNPS confirmés sur cnps.cm — lien : *(à remplir)*
- [ ] Plafond CNPS 750k XAF confirmé sur *(source)* — date : *(à remplir)*
- [ ] Barème IRPP confirmé sur CGI/DGI — lien : *(à remplir)*
- [ ] TVA 19.25% confirmé sur DGI Cameroun — lien : *(à remplir)*
- [ ] Format matricule CNPS confirmé sur *(source)*
- [ ] Format NIU confirmé sur *(source)*
- [ ] Prix LLM vérifiés le *(date)* sur *(liens providers)*
- [ ] 4 URLs en ligne testées le *(date)* : frontend, API+/docs, MCP, MCP Inspector

---

## Décisions prises manuellement (non déléguées)

1. **Orchestrateur côté backend** : clé LLM protégée, logique métier dans MCP, MCP accessible publiquement.
2. **Monorepo** : dev solo, 2.5 jours, contrat front↔back couplé.
3. **Banque Mondiale comme seule API externe** : documentée, sans auth, données live.
4. **Abstraction fournisseur LLM** : `LLM_PROVIDER` env var — pas de lock-in.
5. **Plafond CNPS = 750 000 XAF** (décret 2016) — documenté comme assumption en attente de confirmation.
