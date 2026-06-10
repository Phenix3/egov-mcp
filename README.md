# Liwaza eGov — Plateforme fiscale AI-native pour PME camerounaises

Assistant conversationnel (FR/EN) permettant à une PME camerounaise d'interagir avec ses obligations fiscales et sociales en langage naturel. Calcul CNPS, IRPP, TVA, validation de matricules et indicateurs économiques — tous exposés via un serveur MCP.

## Architecture

```
UI (Next.js) → POST /chat → Orchestrateur LLM (backend) → Serveur MCP → Outils fiscaux + Banque Mondiale
```

- **Frontend** : Next.js 14 + TypeScript + Tailwind CSS. Interface conversationnelle avec historique, visibilité des tool calls, cartes structurées (CNPSCard, PayrollTaxCard, VATCard).
- **Backend** : FastAPI + FastMCP (Streamable HTTP, stateless). 5 outils MCP, auth Bearer, logging JSON structuré, couche d'abstraction LLM configurable.
- **Monorepo** : `frontend/` + `backend/` dans un seul repo. `docker-compose` pour l'intégration complète.

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les décisions d'architecture détaillées, [docs/AI_STRATEGY.md](docs/AI_STRATEGY.md) pour la stratégie LLM, et [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) pour les tokens et composants UI.

## Les 5 outils MCP

| Outil | Type | Description |
|---|---|---|
| `calculate_cnps_contributions` | Déterministe | Cotisations CNPS : pension vieillesse (4,2 % employeur + 4,2 % salarié), alloc. familiales (7 %), ATMP (1,75/2,5/5 % selon risque) |
| `calculate_payroll_tax` | Déterministe | IRPP + retenues salariales selon barème CGI Cameroun |
| `calculate_vat` | Déterministe | TVA Cameroun (19,25 % = 17,5 % base + 10 % CAC) |
| `validate_registration_number` | Déterministe | Validation de format matricule CNPS ou NIU |
| `get_economic_indicator` | HTTP réel | Indicateurs macro Cameroun via API Banque Mondiale |

## URLs publiques

| Service | URL |
|---|---|
| Frontend | https://egov-mcp-liart.vercel.app |
| Backend API + Swagger | https://egov-mcp.onrender.com / https://egov-mcp.onrender.com/docs |
| Endpoint MCP | https://egov-mcp.onrender.com/mcp |
| Health check | https://egov-mcp.onrender.com/health |

## Prérequis

- Python 3.12+
- Node.js 18+
- Docker + Docker Compose (pour l'intégration complète)

## Installation locale

### 1. Variables d'environnement

```bash
cp .env.example .env
# Remplir les valeurs dans .env
```

Variables requises :

```env
LLM_PROVIDER=k2think          # anthropic | openai | k2think
LLM_MODEL=MBZUAI-IFM/K2-Think-v2
K2_API_KEY=votre_clé
K2_BASE_URL=https://api.k2think.ai/v1
MCP_AUTH_TOKEN=votre_token_secret
```

### 2. Backend (port 8000)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger disponible sur `http://localhost:8000/docs`.

### 3. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

### 4. Docker (intégration complète)

```bash
docker-compose up --build
```

## Tests

```bash
# Tests unitaires (rapides, aucun appel réseau)
cd backend
pytest tests/ -x --ignore=tests/test_worldbank.py

# Test Banque Mondiale (appel réseau réel — à exclure du CI)
pytest tests/test_worldbank.py -v

# Test du chat (LLM mocké)
pytest tests/test_chat.py -v
```

| Fichier | Type |
|---|---|
| `test_cnps.py` | Unitaire — plafond, groupes A/B/C |
| `test_payroll_tax.py` | Unitaire — tranches IRPP, abattement 30 % |
| `test_vat.py` | Unitaire — taux config et custom |
| `test_validation.py` | Unitaire — formats CNPS / NIU |
| `test_worldbank.py` | Intégration réelle — API Banque Mondiale |
| `test_chat.py` | Intégration — endpoint `/chat` (LLM mocké) |

## Déploiement

**Frontend → Vercel**
- Connecter le repo GitHub
- Répertoire racine : `frontend/`
- Variable d'env : `NEXT_PUBLIC_API_URL=https://[url_render]`

**Backend → Render**
- Nouveau Web Service, type Docker, répertoire `backend/`
- Variables d'env depuis le dashboard Render
- Start command : `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- L'endpoint `/health` sert de keep-alive pour le free tier

Le serveur MCP est accessible sur `[URL_RENDER]/mcp` (Bearer token requis). Testable via MCP Inspector.

## Structure du projet

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI — /health, /mcp, /chat
│   │   ├── mcp_server.py     # FastMCP, 5 outils, auth
│   │   ├── orchestrator.py   # Boucle LLM + dispatch outils
│   │   ├── provider.py       # Abstraction LLM (Anthropic / OpenAI / K2Think)
│   │   ├── schemas.py        # Modèles Pydantic I/O
│   │   ├── config.py         # Constantes fiscales + env vars
│   │   ├── logging_conf.py   # Logging JSON structuré
│   │   └── tools/            # 1 fichier par outil (logique pure)
│   └── tests/
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/
│   │   └── structured-cards/ # CNPSCard, PayrollTaxCard, VATCard
│   └── lib/
│       ├── api.ts            # Client fetch /chat
│       └── types.ts          # Types TypeScript (sync avec schemas.py)
├── docs/
│   ├── ARCHITECTURE.md       # Décisions d'architecture
│   ├── AI_STRATEGY.md        # Stratégie LLM et fournisseurs
│   └── CONTEXT.md            # Source de vérité — taux fiscaux, contrats API
├── docker-compose.yml
├── .env.example
└── .github/workflows/ci.yml
```

## Hypothèses et limitations connues

- **IRPP** : les tranches utilisées (10 %, 16,5 %, 27,5 %, 38,5 %) sont issues du CGI Cameroun et doivent être confirmées sur la source officielle DGI avant usage en production.
- **Plafond CNPS** : 750 000 XAF/mois selon le décret 2016 — sources divergentes entre 300k et 750k, à confirmer sur cnps.cm.
- **Aucune API gouvernementale d'écriture** : la DGI et la CNPS n'exposent pas d'API publique d'écriture ; seule l'API Banque Mondiale est appelée en HTTP réel.
- **Cold start Render** : le free tier s'endort après inactivité (~50 s de démarrage à froid). Documenté, acceptable pour une démonstration.

## Améliorations futures

- Valider officiellement les tranches IRPP depuis le CGI DGI Cameroun.
- Ajouter génération de bulletins de paie PDF et déclarations multi-périodes.
- Intégrer des API gouvernementales d'écriture lorsqu'elles seront disponibles.
- Self-hosting du LLM pour les workflows à données sensibles (résidence des données).
- Persistance des conversations et comptes multi-tenant.
- Couverture de tests frontend (Jest + Testing Library).
