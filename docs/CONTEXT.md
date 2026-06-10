# CONTEXT.md — Source de vérité du projet eGov MCP

> **À lire en premier par tout agent IA (Claude Code, Antigravity) et par moi.**
> Ce fichier est la **seule source de vérité**. En cas de doute, ce qui est écrit ici prime.

---

## 0. Règles anti-hallucination (OBLIGATOIRES pour l'agent)

1. **N'invente jamais un fait.** Si une valeur n'est pas dans ce fichier, tu ne la fabriques pas.
2. **Respecte les étiquettes de certitude :**
   - ✅ **VÉRIFIÉ** — fait confirmé, source citée. Utilisable tel quel.
   - ⚠️ **À VÉRIFIER** — valeur de référence non confirmée. **Tu la mets en CONSTANTE dans `config.py`, jamais codée en dur dans la logique**, et tu laisses un `# TODO: confirmer sur [source]`. L'humain la validera.
   - 🔧 **DÉCISION** — choix d'architecture (pas un fait du monde). À respecter, pas à rediscuter.
3. **Aucune réponse simulée.** Interdiction totale de données mockées, de réponses codées en dur, de faux résultats (Part 4 de l'énoncé → disqualification possible). Les calculs calculent ; l'appel réseau appelle.
4. **Une seule API externe réelle : la Banque Mondiale** (§7). Il n'existe **pas** d'API publique d'écriture DGI/CNPS/GUCE accessible ici → **n'invente aucun endpoint gouvernemental**. Les outils fiscaux/sociaux sont des **calculateurs déterministes**, pas des appels à un registre.
5. **Si tu ne sais pas, tu t'arrêtes et tu demandes.** Tu laisses un TODO visible plutôt qu'une valeur plausible.

---

## 1. Le produit (1 paragraphe)

Plateforme eGov AI-native pour PME camerounaises. L'utilisateur écrit en **langage naturel, FR ou EN** (ex. *« calcule les cotisations CNPS de mes 4 employés »*) ; le système comprend l'intention, choisit le bon outil MCP, l'exécute, et renvoie un résultat **structuré et exploitable**. Cible : simple et élégant > complexe.

---

## 2. Contraintes non négociables de l'énoncé

- 🔧 Archi imposée : **React (client MCP) → Serveur MCP (backend) → APIs**. Le front ne contourne jamais la couche MCP. La logique métier vit dans le serveur MCP.
- Backend : **Python + FastAPI + Pydantic**, serveur MCP exposant **≥ 5 outils**, avec **validation, gestion d'erreurs, auth, logging, documentation**.
- Frontend : **React** (Next.js + TS + Tailwind + shadcn/ui autorisés). Expérience **conversationnelle** : historique, **visibilité de l'exécution des outils**, sorties structurées, gestion d'erreurs.
- ≥ 1 **API de service public réelle** intégrée.
- Déploiement public en free tier ; front, API backend, endpoint MCP, et docs tous accessibles.
- Livrables : Dockerfile, docker-compose, CI/CD, gestion des env vars, doc de déploiement, doc d'archi, doc stratégie IA, README, vidéo 10–15 min (anglais).
- **Divulgation IA obligatoire** (outils + prompts + parts assistées/manuelles). Chiffres non vérifiés = pénalité.

---

## 3. Architecture (résolution + flux)

🔧 **Résolution de la tension « React = client MCP » :** la React app est le **client MCP de l'expérience** (elle affiche conversation, appels d'outils, résultats). La **boucle d'orchestration LLM tourne côté backend** (la clé LLM ne doit jamais être côté client, et la logique métier reste dans le MCP). Le **serveur MCP est joignable publiquement et indépendamment** (un reviewer le pilote via MCP Inspector). Le front ne contourne jamais le MCP : tout résultat affiché vient d'une exécution d'outil réelle.

**Flux d'une requête :**
```
UI (NL FR/EN) → POST /chat → Orchestrateur (choisit l'outil + extrait params)
→ appel MCP (Streamable HTTP) → Outil (calcul déterministe OU appel Banque Mondiale)
→ résultat typé Pydantic + log structuré → réponse NL + carte structurée → UI
```

---

## 4. Les 5 outils MCP — contrats (ground truth)

> Formes indicatives. L'agent propose les schémas Pydantic exacts pour validation avant de coder.
> Tout **taux/barème** est une constante de `config.py` (voir §6), jamais en dur dans la logique.

**1. `calculate_cnps_contributions`** — déterministe
- In : `employees: list[{ gross_salary: float, sector_risk_group: "A"|"B"|"C" }]`
- Out : par employé et total → `{ old_age_pension_employee, old_age_pension_employer, family_allowances_employer, work_injury_employer, total_employee, total_employer, capped_base }`

**2. `calculate_payroll_tax`** — déterministe (IRPP + retenues salariales)
- In : `{ gross_salary: float, ... }`
- Out : `{ taxable_base, irpp, other_withholdings, net_salary, breakdown }`
- ⚠️ **Le barème IRPP n'est PAS dans ce fichier. Ne l'invente pas.** Table de tranches = constante config, remplie depuis le CGI/DGI.

**3. `calculate_vat`** — déterministe
- In : `{ amount_excl_tax: float, rate?: float }`
- Out : `{ amount_excl_tax, vat_rate, vat_amount, amount_incl_tax }`

**4. `validate_registration_number`** — déterministe (validation de **format**, pas lookup)
- In : `{ number: str, type: "CNPS"|"NIU" }`
- Out : `{ valid: bool, type, normalized, reason? }`

**5. `get_economic_indicator`** — **APPEL HTTP RÉEL** (Banque Mondiale, §7)
- In : `{ indicator: str (code BM), year?: int, most_recent?: int }`
- Out : `{ indicator_code, indicator_name, country: "Cameroon", observations: list[{ year, value }], source: "World Bank" }`

---

## 5. Faits VÉRIFIÉS (avec sources)

> Sources spécialisées CNPS. ⚠️ **Les sources divergent sur certains détails** (plafond, répartition) → valeurs de **référence** à reconfirmer sur **cnps.cm** et à figer en config. Documente-les dans les *assumptions* du README.

**CNPS (secteur privé) — base mensuelle, après déduction des frais professionnels :**
- ✅ **Pension vieillesse (PVID)** : ~**4,2 % employeur + 4,2 % salarié** (la part salariale est passée de 2,8 % à 4,2 % avec le décret de 2016).
  *Sources : projecteurmagazine.cm (jan. 2026) ; cnps.cm.*
- ✅ **Prestations / allocations familiales** : **7 %**, **employeur uniquement**.
- ✅ **Accidents du travail & maladies pro (ATMP)** : **1,75 % / 2,5 % / 5 %** selon le groupe de risque du secteur, **employeur uniquement**.
- ⚠️ **Plafond de l'assiette cotisable** : sources divergentes — **300 000** vs **750 000 XAF/mois** (le décret 2016 relève le plafond). **À confirmer.** Mets-le en config (`CNPS_CEILING_XAF`).

**Vocabulaire / contexte :**
- ✅ Paiement CNPS déclaratif ; les charges du mois sont dues **avant le 15 du mois suivant**.
- ✅ La base minimale ne peut être < **SMIG**.

---

## 6. Faits À VÉRIFIER — NE PAS INVENTER (→ config)

| Valeur | Étiquette | Où la trouver | Constante config |
|---|---|---|---|
| Barème IRPP (tranches + taux) | ⚠️ | CGI / DGI Cameroun | `IRPP_BRACKETS` |
| Taux TVA standard | ⚠️ (souvent cité **19,25 %** = 17,5 % + 10 % CAC) | DGI Cameroun | `VAT_RATE` |
| Plafond CNPS | ⚠️ (300k vs 750k) | cnps.cm / décret 2016 | `CNPS_CEILING_XAF` |
| Format exact matricule CNPS / NIU | ⚠️ | docs CNPS / DGI | `CNPS_NUMBER_REGEX`, `NIU_REGEX` |
| Prix / latence / contexte des LLM (pour AI_STRATEGY) | ⚠️ | page tarifs de chaque fournisseur, **le jour J** | — |

> **CAC** = Centimes Additionnels Communaux (surtaxe ~10 % qui explique l'écart 17,5 % → 19,25 %). À confirmer avant de coder le taux.

---

## 7. API réelle : Banque Mondiale ✅ (structure vérifiée)

*Source : World Bank Data Help Desk (datahelpdesk.worldbank.org). Pas de clé requise.*

- **Pattern d'appel :**
  `https://api.worldbank.org/v2/country/CMR/indicator/{CODE}?format=json`
  - `format=json` **obligatoire** (XML par défaut sinon).
  - `mrv=N` → N valeurs les plus récentes (ex. `mrv=5`). `date=2014:2024` → plage. `per_page=N`.
  - Cameroun : ISO3 = **CMR**, ISO2 = **CM**.
- **Codes d'indicateurs (✅ vérifiés) :**
  - `NY.GDP.MKTP.CD` — PIB (USD courants)
  - `FP.CPI.TOTL.ZG` — inflation (IPC, % annuel)
  - `SP.POP.TOTL` — population totale
  - `GC.TAX.TOTL.GD.ZS` — recettes fiscales (% du PIB)
- **Forme de réponse (documentée — parser défensivement, `value` peut être `null`) :**
```json
[
  { "page": 1, "pages": 1, "per_page": 50, "total": 3, "lastupdated": "..." },
  [
    {
      "indicator": { "id": "NY.GDP.MKTP.CD", "value": "GDP (current US$)" },
      "country":   { "id": "CM", "value": "Cameroon" },
      "countryiso3code": "CMR",
      "date": "2024",
      "value": 51234567890.0
    }
  ]
]
```
> Tableau à **2 éléments** : `[0]` = pagination, `[1]` = liste d'observations. L'outil doit gérer `value: null` et une liste vide. **Frappe l'endpoint en vrai et adapte-toi à la réponse live** (ne te fie pas aveuglément à l'exemple ci-dessus).

🔧 *Optionnel, à confirmer joignable avant de l'utiliser :* Open Data Cameroun (CKAN). Si l'API ne répond pas de façon fiable, **on s'en tient à la Banque Mondiale** — ne fabrique pas de fallback fictif.

---

## 8. Contrat `/chat` (front ↔ back) 🔧

> À figer une fois, identique des deux côtés (`backend/app/schemas.py` ↔ `frontend/lib/types.ts`).

**Requête :**
```json
{ "messages": [{ "role": "user", "content": "calcule les cotisations CNPS de mes 4 employés à 200000 XAF" }],
  "lang": "fr" }
```
**Réponse :**
```json
{
  "reply": "texte en langage naturel",
  "tool_calls": [
    { "tool": "calculate_cnps_contributions",
      "arguments": { "...": "..." },
      "result": { "...": "..." },
      "latency_ms": 42,
      "status": "ok" }
  ],
  "structured": { "type": "cnps_table", "data": { "...": "..." } }
}
```
> `tool_calls` alimente la **visibilité de l'exécution** ; `structured` alimente la **carte de résultat**. Si aucun outil n'est pertinent, `tool_calls: []`.

---

## 9. Stack & versions 🔧

- Backend : Python 3.12+, FastAPI, Pydantic v2, SDK MCP officiel Python (FastMCP), transport **Streamable HTTP** (`stateless_http=True`, `json_response=True`), `httpx` pour l'appel BM.
- Frontend : Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- Orchestrateur : couche d'abstraction fournisseur (`provider.py`) ; modèle par défaut configurable par env.
- ⚠️ **N'épingle pas de numéro de version exact de mémoire** — installe la **dernière stable** et vérifie les imports contre la doc à jour du SDK MCP.

---

## 10. Déploiement 🔧

- Frontend → **Vercel**. Backend (+ MCP) → **Render** (conteneur long-running ; le serverless Vercel ne convient pas au MCP streamable/stateful).
- ✅ **Caveat free tier Render** : le service s'endort après inactivité (cold start au réveil). À **documenter comme limitation connue** + endpoint `/health` + petit keep-alive. ⚠️ Ne donne pas de durée de cold start chiffrée sauf si elle a été **chronométrée**.
- Secrets (clé LLM, token MCP) : **env vars uniquement**, jamais côté client, jamais commités. `.env.example` liste les clés sans valeurs.

---

## 11. Glossaire métier (utiliser les bons termes, ne pas confondre)

- **CNPS** — Caisse Nationale de Prévoyance Sociale (sécurité sociale du **secteur privé**).
- **NIU** — Numéro Identifiant Unique (identifiant fiscal contribuable, DGI).
- **IRPP** — Impôt sur le Revenu des Personnes Physiques.
- **TVA** — Taxe sur la Valeur Ajoutée. **CAC** — Centimes Additionnels Communaux (surtaxe).
- **CGI** — Code Général des Impôts. **DGI** — Direction Générale des Impôts.
- **DSF** — Déclaration Statistique et Fiscale (déclaration annuelle).
- **SMIG** — Salaire Minimum Interprofessionnel Garanti.
- **GUCE** — Guichet Unique du Commerce Extérieur.
- **XAF** — Franc CFA (Afrique centrale).

---

## 12. Interdits (récapitulatif)

- ❌ Inventer un taux, une tranche, un plafond, un format de matricule.
- ❌ Inventer un endpoint gouvernemental (DGI/CNPS/GUCE). Seule API externe = Banque Mondiale.
- ❌ Réponses mockées / codées en dur / simulées.
- ❌ Mettre une clé LLM ou un secret côté client.
- ❌ Donner un chiffre (prix LLM, cold start, latence) non mesuré / non vérifié.
- ✅ En cas de doute : `# TODO: à vérifier` + demander, jamais combler par une valeur plausible.
