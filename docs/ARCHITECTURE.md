# Document de Décisions d'Architecture

## 1. Vue d'ensemble du système

Cette plateforme permet à une PME camerounaise d'interagir avec ses obligations fiscales et sociales en langage naturel, en français ou en anglais. Un utilisateur tape une requête comme *« Calcule les cotisations CNPS pour mes 4 employés »* et reçoit une réponse structurée et exploitable.

L'architecture respecte le schéma imposé par l'énoncé :

```
Frontend React/Next.js  →  Backend FastAPI (Orchestrateur + Serveur MCP)  →  Moteurs de calcul + API publiques
```

Toute la logique métier vit dans le serveur MCP. Le frontend ne parle jamais directement à une API gouvernementale ou publique — il ne communique qu'avec notre backend via `/chat`.

---

## 2. Diagramme d'architecture

```
+-------------------------+        HTTPS         +-------------------------------------+
|  Frontend (Next.js)      |   POST /chat (NL)    |  Backend (FastAPI)                   |
|  - UI conversationnelle  | -------------------> |                                      |
|  - Historique de convo   |                      |  +--------------------------------+  |
|  - Visibilité des outils | <------------------- |  | Orchestrateur LLM              |  |
|  - Cartes structurées    |   résultat structuré |  | NL → choix d'outil → exécution |  |
|                          |                      |  +---------------+----------------+  |
|  Hébergé sur Vercel      |                      |                  | MCP Streamable HTTP|
+-------------------------+                       |  +---------------v----------------+  |
                                                  |  | Serveur MCP (FastMCP)          |  |
   (Évaluateurs peuvent aussi appeler             |  | 5 outils, auth Bearer, logs    |  |
    l'endpoint MCP directement) - - - - - - - - ->|  +--+-------------------+---------+  |
                                                  |     | déterministe       | HTTP       |
                                                  |  +--v-----------+  +-----v----------+ |
                                                  |  | Moteurs de   |  | API publiques  | |
                                                  |  | calcul fiscal|  | (Banque Mondiale)| |
                                                  |  | (CGI / CNPS) |  |                | |
                                                  |  +--------------+  +----------------+ |
                                                  |  Hébergé sur Render                   |
                                                  +---------------------------------------+
```

---

## 3. Composants et interactions

| Composant | Responsabilité | Communique avec |
|---|---|---|
| **Frontend (Next.js)** | UI conversationnelle, historique, affichage des tool calls, cartes structurées (CNPS, IRPP, TVA). | Endpoint `/chat` du backend uniquement. |
| **Orchestrateur LLM** | Interprète la requête NL, sélectionne le(s) outil(s) MCP, les exécute, compose la réponse finale. | Fournisseur LLM ; serveur MCP (in-process). |
| **Serveur MCP (FastMCP)** | Source unique de la logique métier. 5 outils exposés. Validation Pydantic, auth Bearer, logging JSON structuré, gestion d'erreurs. | Moteurs de calcul ; API Banque Mondiale. |
| **Moteurs de calcul** | Fonctions pures et déterministes implémentant les règles fiscales camerounaises (CGI, CNPS). | — (en mémoire, aucun I/O). |
| **API de données publiques** | Vrai appel HTTP sortant vers `api.worldbank.org` pour les indicateurs macro. | API externe (World Bank). |

**Pourquoi l'orchestrateur vit dans le backend, pas dans le navigateur.** J'ai évalué les deux approches. Faire tourner la boucle d'agent côté client serait plus « pur » conceptuellement, mais cela exposerait la clé LLM au navigateur et déplacerait les décisions métier hors du serveur MCP — ce qui violerait directement la consigne. Garder l'orchestrateur côté serveur préserve une unique frontière de confiance, garde les secrets côté serveur et maintient le frontend mince. L'endpoint MCP est aussi exposé publiquement pour que les évaluateurs puissent inspecter le trafic brut sans passer par l'UI.

---

## 4. Topologie de déploiement

| Couche | Plateforme | Raison |
|---|---|---|
| Frontend | **Vercel** | Intégration Next.js native, CDN global, déploiement automatique à chaque push. |
| Backend + MCP | **Render** | Conteneur long-running requis pour le transport MCP Streamable HTTP. Le modèle serverless de Vercel est incompatible avec les connexions persistantes. Free tier avec URL publique, variables d'environnement et logs intégrés. |

**Tradeoff assumé :** le free tier Render s'endort après inactivité (~50 s de cold start). Pour une démonstration c'est acceptable et documenté comme limitation connue. L'endpoint `/health` sert aussi de keep-alive pour réduire la fréquence des cold starts.

URLs publiques (à compléter après déploiement) :
- Frontend : `[URL_VERCEL]`
- Backend API + Swagger : `[URL_RENDER]` / `[URL_RENDER]/docs`
- Endpoint MCP : `[URL_RENDER]/mcp`

---

## 5. Flux de données

1. L'utilisateur envoie un message en langage naturel (FR/EN) → `POST /chat`.
2. L'orchestrateur LLM interprète l'intention et sélectionne le(s) outil(s) MCP pertinent(s).
3. L'orchestrateur appelle l'outil. Pydantic valide les entrées avant tout calcul.
4. L'outil exécute un calcul fiscal déterministe **ou** un vrai appel HTTP vers l'API Banque Mondiale.
5. Chaque exécution est loggée : nom de l'outil, source, latence, statut.
6. L'orchestrateur compose une réponse NL + structure Pydantic typée.
7. Le frontend affiche la réponse, indique l'outil exécuté et rend la carte structurée correspondante.

---

## 6. Décisions clés d'architecture

**Monorepo.** Un seul dépôt avec `frontend/` et `backend/`. Raison : développeur unique, horizon court, contrat front↔back fortement couplé. Un seul `git clone`, un seul `docker-compose up`, un seul pipeline CI minimisent la friction pour l'évaluateur et pour moi. Le tradeoff est un CI légèrement plus verbeux à filtrer par dossier, mais le multi-repo ne se justifie qu'avec plusieurs équipes à des cadences de déploiement différentes — ce n'est pas le cas ici.

**Transport MCP = Streamable HTTP, stateless.** C'est le transport recommandé par la spec MCP officielle pour la production. `stateless_http=True` + `json_response=True` permettent la réplication horizontale sans session sticky. SSE aurait marché aussi et a un meilleur support legacy, mais Streamable HTTP est le défaut tourné vers l'avenir, et c'est celui documenté dans l'énoncé.

**Outils cohérents par domaine (fiscal/social).** Un LLM sélectionne les outils plus fiablement quand ils partagent un domaine clair et des frontières nettes. Mélanger calcul déterministe et récupération de données en direct garantit à la fois l'authenticité de l'exécution et une vraie valeur produit. Le périmètre plus étroit qu'une plateforme « tout service gov » est un choix délibéré : mieux vaut 5 outils fiables que 10 approximatifs.

**Abstraction du fournisseur LLM.** La couche `provider.py` (ABC + 3 adaptateurs : Anthropic, OpenAI, K2Think) permet de changer de modèle par variable d'environnement. Raison : le paysage des modèles bouge chaque mois, et un produit à données fiscales ne peut être otage de la tarification d'un seul vendeur. Tradeoff : un peu plus de code à maintenir, mais le gain en flexibilité est réel.

**Secrets côté serveur uniquement.** La clé LLM et le token MCP vivent exclusivement dans les variables d'environnement du backend. Le frontend ne reçoit jamais de secret. C'est une contrainte non négociable pour un produit traitant des données de paie.

---

## 7. Scalabilité — de 100 à 100 000 utilisateurs

**Réplication horizontale.** Le backend est stateless (aucune affinité serveur par requête), donc le levier principal est la réplication derrière un load balancer. L'état de conversation sort du process vers un datastore (Postgres + Redis). À 100 utilisateurs un seul conteneur suffit ; à 100k, un pool auto-scalé de conteneurs identiques absorbe la charge.

**Caching.** Les indicateurs Banque Mondiale changent lentement → cache Redis avec TTL long. Les tables de taux fiscaux sont quasi-statiques → cache agressif. Les moteurs de calcul déterministes n'ont pas besoin de cache (recalcul peu coûteux), mais leurs tables de taux en ont un.

**Jobs en arrière-plan.** Les opérations lourdes (déclarations de paie par lot, rapports multi-périodes) passent dans une file de workers (Celery/RQ) pour que le chemin de requête reste réactif.

**Observabilité.** Logs JSON structurés vers un agrégateur (Loki/Grafana). Métriques par outil : appels, latence, taux d'erreur. À 100k utilisateurs c'est non négociable pour repérer tôt un outil défaillant.

**Coûts.** À l'échelle, le coût dominant est celui des tokens LLM, pas le compute. Mitigations : cache des réponses récurrentes, routage des requêtes simples vers un modèle moins cher, prompts concis. Voir `AI_STRATEGY.md` pour la stratégie complète.

---

## 8. Sécurité

- **Secrets** (clé LLM, tokens d'API) uniquement côté serveur, injectés via variables d'environnement, jamais au client.
- **Auth MCP** : Bearer token requis sur `/mcp` — les outils ne sont pas invocables anonymement.
- **Validation des entrées** : Pydantic rejette toute entrée malformée avant calcul ou appel sortant.
- **Données sensibles** : matricules CNPS et données de paie sont validés en format seulement, sans persistance inutile. C'est aussi l'argument central pour auto-héberger les workflows sensibles à l'échelle (voir `AI_STRATEGY.md`).

---

## 9. Améliorations futures

- Intégrer de vraies API gouvernementales en écriture (soumission de déclarations DGI/CNPS) lorsqu'elles seront disponibles.
- Ajouter des outils supplémentaires : déclaration multi-périodes, calcul de congés payés, bulletin de paie PDF.
- Auto-héberger l'orchestrateur LLM pour les workflows à données sensibles (résidence des données, conformité).
- Persister les conversations et gérer des comptes multi-tenant pour organisations.
- Remplir les tranches IRPP manquantes depuis le CGI officiel DGI Cameroun et étendre la couverture fiscale.
