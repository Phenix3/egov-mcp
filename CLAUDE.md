# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source de vérité

**`docs/CONTEXT.md` est la source de vérité absolue.** En cas de doute sur un taux fiscal, un schéma Pydantic, ou un contrat d'API — lire ce fichier en premier. Il contient les règles anti-hallucination obligatoires.

## Structure du monorepo

```
egov-mcp/
├── backend/app/
│   ├── main.py           # FastAPI + montage MCP
│   ├── mcp_server.py     # FastMCP, 5 outils, auth, logging
│   ├── tools/            # 1 fichier par outil (logique pure)
│   ├── orchestrator.py   # boucle LLM + couche provider.py
│   ├── schemas.py        # modèles Pydantic I/O (sync avec frontend/lib/types.ts)
│   └── config.py         # TOUTES les constantes fiscales (taux, barèmes, plafonds)
├── frontend/app/         # Next.js App Router
├── docker-compose.yml
└── .env.example
```

## Commandes courantes

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # dev server (port 8000)
pytest                                  # tous les tests
pytest tests/test_tools.py::test_cnps  # test unitaire ciblé
```

### Frontend
```bash
cd frontend
npm install
npm run dev    # dev server (port 3000)
npm run build  # vérification de build
npm run lint
```

### Docker (intégration complète)
```bash
docker-compose up --build   # lance back + front ensemble
```

## Architecture — flux d'une requête

```
UI (NL FR/EN) → POST /chat → Orchestrateur LLM (choisit l'outil)
→ appel MCP Streamable HTTP → Outil (calcul déterministe OU appel Banque Mondiale)
→ résultat Pydantic + log JSON → réponse NL + carte structurée → UI
```

L'orchestrateur LLM tourne **côté backend** (jamais dans le navigateur) — la clé LLM ne doit jamais être côté client.

Le serveur MCP est joignable publiquement et indépendamment (testé via MCP Inspector).

## Les 5 outils MCP

| Outil | Type | Description |
|---|---|---|
| `calculate_cnps_contributions` | Déterministe | Cotisations CNPS : pension vieillesse (4,2 % employeur + 4,2 % salarié), alloc. familiales (7 % employeur), ATMP (1,75/2,5/5 % selon risque) |
| `calculate_payroll_tax` | Déterministe | IRPP + retenues salariales selon barème CGI Cameroun |
| `calculate_vat` | Déterministe | TVA Cameroun (taux dans `config.py`) |
| `validate_registration_number` | Déterministe | Validation de **format** matricule CNPS / NIU — pas de lookup registre |
| `get_economic_indicator` | **Appel HTTP réel** | API Banque Mondiale — `https://api.worldbank.org/v2/country/CMR/indicator/{CODE}?format=json` |

## Règles impératives

**Taux fiscaux :** toujours dans `config.py` en constantes nommées — jamais codés en dur dans la logique. Les valeurs ⚠️ `À VÉRIFIER` dans CONTEXT.md sont des `# TODO: confirmer sur [source]`.

**Aucune réponse simulée :** interdiction de mocks, réponses constantes ou faux résultats. Chaque outil calcule ou appelle réellement.

**Aucun endpoint gouvernemental inventé :** seule API externe = Banque Mondiale. La DGI/CNPS/GUCE n'ont pas d'API publique d'écriture accessible.

**Contrat `/chat` :** `schemas.py` (backend) et `lib/types.ts` (frontend) doivent rester synchronisés. Forme définie dans `docs/CONTEXT.md §8`.

**Secrets :** env vars uniquement. Jamais dans le code, jamais côté client.

## Déploiement

- Frontend → **Vercel**
- Backend + MCP → **Render** (conteneur long-running — le serverless Vercel ne convient pas au transport MCP Streamable HTTP)
- Transport MCP : `stateless_http=True`, `json_response=True`
- Endpoint `/health` requis (keep-alive Render free tier)
