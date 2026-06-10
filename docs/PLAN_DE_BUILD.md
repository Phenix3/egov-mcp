# Plan de build — eGov MCP (Liwaza) · Claude Code + Antigravity

> Deadline : **mercredi 10 juin 23:59 GMT**. On est le 8 → il te reste ~2,5 jours.
> Budget visé par l'énoncé : 12–15 h de travail concentré. Objectif = **simple + bien raisonné**,
> pas complet en prod. Tu seras noté sur ton jugement, pas sur le volume.

---

## 0. Principe directeur (à relire avant chaque doc écrit)

- **Tu décides, l'IA exécute.** Pour chaque choix (stack, outils, archi, modèle LLM), prends la décision toi-même, à voix haute, puis laisse l'agent coder. Les docs s'écrivent *après* le build, à partir de tes vraies décisions.
- **Tiens un journal de prompts en continu** (`AI_DISCLOSURE.md`, voir §9) — c'est obligatoire et c'est aussi ta meilleure preuve d'ownership.
- **Aucun chiffre non vérifié.** Taux fiscaux, prix LLM, latences : tu les vérifies sur la source officielle ou tu ne les mets pas.
- **Exécution réelle obligatoire** (Part 4) : tes outils doivent calculer/appeler pour de vrai. Les reviewers inspectent le trafic réseau et MCP.

---

## 1. Décisions verrouillées (à ne plus rediscuter)

| Sujet | Choix | Raison courte (à reformuler en vidéo avec tes mots) |
|---|---|---|
| Monorepo | **Oui**, `frontend/` + `backend/` | Dev solo, 2,5 j, contrat front↔back très couplé. Un clone, un compose. |
| Backend | **Python + FastAPI + Pydantic + SDK MCP officiel (FastMCP), transport Streamable HTTP** | Imposé par l'énoncé + transport recommandé prod, stateless → réplicable. |
| Frontend | **Next.js + TypeScript + Tailwind + shadcn/ui** | React imposé ; Next + shadcn = design system léger rapide à monter. |
| Orchestrateur LLM | **Côté backend**, derrière une fine couche d'abstraction fournisseur | Protège la clé LLM, garde la logique métier dans le MCP (cf §4). |
| Déploiement | **Vercel** (front) + **Render** (back, conteneur long-running) | MCP stateful/streamable ≠ serverless Vercel. Free tier OK. |
| API réelle | **Banque Mondiale (indicateurs Cameroun)** garantie + tentative **Open Data Cameroun (CKAN)** | API publique documentée, sans auth, données live → vrai appel sortant visible. |

> **Le piège n°1 du free tier Render** : le conteneur s'endort après inactivité (cold start). Documente-le comme limitation connue + ajoute un petit keep-alive (cron qui ping `/health`). Ne prétends pas l'avoir mesuré si tu ne l'as pas chronométré.

---

## 2. Les 5 outils MCP (4 déterministes + 1 API réelle)

Mélange volontaire : les calculs déterministes prouvent l'exécution (résultat varie selon l'entrée, jamais constant), l'appel Banque Mondiale prouve l'appel réseau sortant.

1. `calculate_cnps_contributions` — cotisations CNPS pour une liste d'employés (salaire brut). Sortie : part patronale / salariale détaillée par branche.
2. `calculate_payroll_tax` (IRPP + autres retenues sur salaire, barème CGI Cameroun) — déterministe.
3. `calculate_vat` (TVA) — calcule la TVA et un récap de déclaration. Déterministe.
4. `validate_registration_number` — valide le **format** d'un matricule CNPS / NIU (longueur, structure, éventuel checksum). Validation, pas lookup registre (pas d'API publique fiable pour ça).
5. `get_economic_indicator` — **vrai appel HTTP** à l'API Banque Mondiale pour un indicateur Cameroun (PIB, inflation, recettes fiscales % PIB…). C'est l'appel qui apparaît dans les traces réseau.

### Données vérifiées (sources officielles / spécialisées CNPS — à reconfirmer et **citer** dans tes assumptions)

- **Pension vieillesse** : 4,2 % employeur **+** 4,2 % salarié (la part salariale est passée de 2,8 % à 4,2 % via le décret de 2016).
- **Prestations / allocations familiales** : 7 %, **à la charge de l'employeur uniquement**.
- **Accidents du travail / maladies pro** : **1,75 % / 2,5 % / 5 %** selon le groupe de risque du secteur, employeur uniquement.
- **Plafond de l'assiette cotisable** : sources divergentes (300 000 vs 750 000 XAF/mois selon les pages et les périodes). **→ Confirme le plafond en vigueur et documente l'hypothèse explicitement** ; passe-le en paramètre/constante configurable.
- **TVA Cameroun** : taux standard usuel 19,25 % — **à vérifier sur la DGI** avant de le coder en dur.

> Cette divergence sur le plafond et les secteurs est exactement ce qu'il faut **assumer et documenter** dans le README (section *assumptions*). Le faire montre ton jugement ; le cacher te coûte des points.

---

## 3. Architecture — le point de raisonnement clé (Part 3)

L'énoncé dit « React = MCP client » ET « business logic dans le MCP server » ET « clé LLM jamais côté client ». Tension réelle. Ta résolution (à défendre en vidéo) :

> La React app est le **client MCP de l'expérience** : elle affiche conversation, appels d'outils et résultats structurés. La **boucle d'orchestration LLM tourne côté serveur** (secrets protégés, logique métier dans le MCP). Le **serveur MCP est joignable publiquement et indépendamment** → un reviewer peut le piloter directement avec n'importe quel client MCP (ex. **MCP Inspector**). Le front ne contourne jamais la couche MCP : chaque résultat affiché provient d'une exécution d'outil MCP réelle.

Flux : `UI → POST /chat (NL) → orchestrateur (choisit l'outil) → appel MCP → outil (calcul ou appel BM) → résultat typé + log → réponse NL + carte structurée`.

Diagramme, topologie, data flow : tu as déjà un bon brouillon dans `ARCHITECTURE.md` → garde-le mais **réécris la section « Décisions clés » avec tes mots après le build**, et remplace les `[À COMPLÉTER]` par tes vraies URLs.

---

## 4. Structure du monorepo

```
egov-mcp/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI + montage du sous-app MCP
│   │   ├── mcp_server.py        # FastMCP, 5 outils, auth, logging
│   │   ├── tools/               # 1 fichier par outil (logique pure)
│   │   ├── orchestrator.py      # boucle LLM, couche d'abstraction fournisseur
│   │   ├── schemas.py           # modèles Pydantic (I/O des outils)
│   │   ├── config.py            # env vars, secrets
│   │   └── logging_conf.py      # logs JSON structurés (outil, params, latence, statut)
│   ├── tests/                   # unit (calculs) + integration (MCP + API réelle)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Next.js App Router
│   ├── components/              # composants réutilisables (design system)
│   ├── lib/                     # client API, types partagés
│   └── Dockerfile
├── .github/workflows/ci.yml     # lint + tests back + build front
├── docker-compose.yml
├── .env.example                 # toutes les vars, aucune valeur secrète
├── README.md
├── ARCHITECTURE.md
├── AI_STRATEGY.md
└── AI_DISCLOSURE.md
```

---

## 5. Répartition Claude Code ⟷ Antigravity

Joue sur les forces de chaque agent.

**Claude Code (terminal)** — tout le backend, l'infra, le git :
- serveur MCP + 5 outils + Pydantic + auth + logging + gestion d'erreurs ;
- tests unitaires & d'intégration ;
- Dockerfile back, `docker-compose`, `.github/workflows/ci.yml`, `.env.example` ;
- commits propres au fil de l'eau (bon pour l'historique = preuve d'itération).

**Antigravity (IDE agentique, Gemini 3, vérification navigateur)** — tout le frontend :
- UI conversationnelle Next.js, historique, **visibilité de l'exécution des outils**, sorties structurées, gestion d'erreurs ;
- design system léger (couleurs, typo, spacing, composants, responsive, accessibilité) ;
- son **agent ouvre un navigateur sur `localhost:3000`, vérifie le rendu et capture des screenshots** → ça te fournit directement les **captures d'écran exigées par le README**.

> Garde le contrat d'API (forme de `/chat`, des résultats d'outils) dans `frontend/lib/types.ts` et `backend/app/schemas.py` synchronisés — c'est le seul point de friction du split. Décide la forme une fois, donne-la aux deux agents.

---

## 6. Prompts de démarrage (prêts à coller)

### → Claude Code (lancer dans un dossier `egov-mcp/` vide)

```
Tu construis le backend d'une plateforme eGov AI-native pour PME camerounaises.
Stack imposée : Python, FastAPI, Pydantic, SDK MCP officiel (FastMCP) en transport
Streamable HTTP, stateless. Monorepo : crée backend/ selon cette structure : [colle §4].

Construis un serveur MCP exposant 5 outils :
1. calculate_cnps_contributions  2. calculate_payroll_tax  3. calculate_vat
4. validate_registration_number  5. get_economic_indicator (vrai appel HTTP à l'API
   Banque Mondiale pour un indicateur Cameroun, code pays CMR).

Contraintes :
- Logique métier 100% dans le serveur MCP. Les taux fiscaux sont des CONSTANTES
  configurables dans config.py, pas codées en dur dans la logique (je les vérifierai).
- Validation Pydantic stricte en entrée ; gestion d'erreurs explicite ; auth par token
  sur le serveur MCP ; logging JSON structuré par appel (outil, params, source, latence, statut).
- Un endpoint /chat (orchestrateur LLM) derrière une couche d'abstraction fournisseur
  (provider.py) pour pouvoir changer de modèle par config. Ne mets aucune clé en dur.
- Le serveur MCP doit aussi être joignable publiquement et indépendamment (MCP Inspector).
- Tests : unitaires sur chaque calcul (cas limites), intégration sur l'appel MCP et l'appel
  Banque Mondiale réel.
- Dockerfile, docker-compose, .github/workflows/ci.yml, .env.example.

Avant d'écrire, propose-moi : la liste des paramètres/sorties Pydantic de chaque outil et la
forme JSON de /chat. J'approuve, puis tu codes. Commits atomiques au fil de l'eau.
```

### → Antigravity (Agent Manager, mode agent-assisted recommandé)

```
Construis le frontend Next.js + TypeScript + Tailwind + shadcn/ui d'un assistant eGov
conversationnel (FR/EN). Il parle UNIQUEMENT à mon backend via POST /chat (jamais à une API
gouvernementale directement). Voici le contrat d'API : [colle la forme de /chat et des résultats
d'outils décidée avec le backend].

Exigences produit (on préfère simple et élégant) :
- interface de chat (saisie NL FR/EN), historique de conversation ;
- VISIBILITÉ de l'exécution des outils : montrer quel outil MCP a tourné, ses paramètres, sa latence ;
- sorties structurées sous forme de cartes (ex. tableau de cotisations CNPS, récap TVA) ;
- gestion d'erreurs propre (backend down, validation échouée) ;
- design system léger : palette, typographie, échelle d'espacement, composants réutilisables,
  layout responsive, accessibilité (contraste, focus, aria).

Après chaque écran, ouvre localhost:3000 dans ton navigateur, vérifie le rendu, et capture
des screenshots desktop + mobile (je m'en servirai pour le README).
```

---

## 7. Timeline 2,5 jours

| Bloc | Quoi |
|---|---|
| **J1 matin** | Vérifier taux CNPS/TVA/IRPP (sources officielles, noter les liens). Décider les schémas Pydantic + forme `/chat`. Lancer Claude Code sur le backend. |
| **J1 aprèm** | Backend : 5 outils + validation + logging + auth. Tester l'appel Banque Mondiale réel. Premiers tests unitaires. |
| **J2 matin** | Orchestrateur `/chat` + abstraction fournisseur. Lancer Antigravity sur le frontend en parallèle. |
| **J2 aprèm** | Frontend : chat, visibilité outils, cartes structurées, design system, responsive. Screenshots. |
| **J3 matin** | Docker + compose + CI. Déployer Render (back) + Vercel (front). Vérifier que **les 4 URLs répondent** (front, API+`/docs`, MCP, MCP via Inspector). Tests d'intégration verts. |
| **J3 aprèm** | Réécrire ARCHITECTURE/AI_STRATEGY **avec tes mots** + remplir vrais chiffres/URLs. README + assumptions/tradeoffs. Finaliser `AI_DISCLOSURE.md`. **Vidéo 10–15 min en anglais.** Soumettre. |

---

## 8. AI strategy — ce qui te reste à faire

Ton `AI_STRATEGY.md` est solide sur le raisonnement (orchestrateur Sonnet par défaut + escalade Opus/GPT-4.1, abstraction fournisseur, self-hosting Llama/Mistral pour données sensibles, angle RGPD/résidence eGov). Il manque **les chiffres vérifiés** : prix/token, fenêtre de contexte, latence — vérifie-les **sur la page tarifs de chaque fournisseur le jour de la soumission** (ça bouge tout le temps) et ne livre que ce que tu as vu. Reformule ensuite la « Recommandation » avec ta voix.

---

## 9. AI_DISCLOSURE.md (obligatoire — template)

```markdown
# Divulgation d'usage de l'IA

## Outils utilisés
- Claude Code — backend, tests, Docker, CI
- Antigravity (Gemini 3) — frontend, design system, vérification UI
- [autres : ChatGPT/Cursor/etc.]

## Parties assistées par IA vs écrites manuellement
- Backend MCP : généré par Claude Code, revu/corrigé par moi (préciser quoi)
- Frontend : généré par Antigravity, ajustements manuels (préciser)
- Taux fiscaux : vérifiés manuellement (liens sources)
- ARCHITECTURE / AI_STRATEGY : raisonnement et décisions à moi, rédaction assistée puis réécrite

## Prompts utilisés
[Colle ici tes prompts au fil de l'eau — pas à la fin de mémoire.]

## Vérifications effectuées
- Taux CNPS/TVA confirmés sur : [liens]
- Prix LLM confirmés le [date] sur : [liens]
- Les 4 URLs testées en ligne le [date]
```

---

## 10. Checklist de soumission

- [ ] Repo GitHub **public**
- [ ] URL frontend en ligne
- [ ] URL API backend + `/docs` (Swagger) en ligne
- [ ] URL endpoint MCP joignable (testée avec MCP Inspector)
- [ ] `ARCHITECTURE.md` — placeholders supprimés, vraies URLs, décisions à tes mots
- [ ] `AI_STRATEGY.md` — chiffres vérifiés, reco reformulée
- [ ] `README.md` — overview, setup, deploy, archi, **screenshots**, assumptions, tradeoffs, futur
- [ ] `AI_DISCLOSURE.md` — outils + prompts + vérifs
- [ ] Dockerfile + docker-compose + CI/CD + `.env.example`
- [ ] Tests unitaires + intégration verts
- [ ] **Vidéo 10–15 min en anglais** couvrant les 10 points de la Part 10
- [ ] Note « À SUPPRIMER AVANT SOUMISSION » bien retirée des deux .md
```
