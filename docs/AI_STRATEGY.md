# Stratégie IA & LLM

## 1. Ce que ce produit demande réellement à un LLM

Ce n'est pas un chatbot généraliste. C'est un assistant eGov qui :
- comprend des requêtes fiscales/sociales en **français et en anglais** ;
- mappe une requête en texte libre vers un **outil MCP précis** et en extrait les paramètres ;
- manipule des **données sensibles** — matricules CNPS, salaires, données de paie ;
- tourne aujourd'hui sur une empreinte gratuite mais doit avoir une trajectoire de coût crédible à l'échelle.

Le rôle principal du LLM est donc **compréhension d'intention + appel d'outils fiable + fluidité bilingue**, pas la génération libre. Cela recadre toute la comparaison : les benchmarks bruts du « modèle le plus intelligent » comptent moins que la *fiabilité du tool-calling, la latence, le coût par requête et les garanties de traitement des données*.

---

## 2. Axes d'évaluation

| Axe | Pourquoi ça compte *ici* |
|---|---|
| **Qualité (tool-calling + FR/EN)** | Un mauvais choix d'outil = une mauvaise réponse fiscale. La précision bilingue est obligatoire. |
| **Coût** | Le coût des tokens domine à l'échelle ; le MVP tourne sur des tiers gratuits. |
| **Latence** | L'UX conversationnelle exige des réponses de l'ordre de la seconde. |
| **Confidentialité** | Les requêtes peuvent contenir des données personnelles et de paie. |
| **RGPD / conformité** | Données d'employés camerounais ; questions de résidence et de transfert transfrontalier. |
| **Self-hosting** | Option stratégique pour garder les workflows sensibles entièrement en interne. |

---

## 3. Évaluation modèle par modèle

**Claude Sonnet (Anthropic)** — Recommandé comme orchestrateur par défaut en production. Tool-calling et suivi d'instructions fiables, fenêtre de contexte généreuse, bonne gestion du français. Point d'équilibre coût/latence intéressant pour un assistant dont le rôle principal est « choisir le bon outil, remplir ses paramètres, expliquer le résultat ».

**Claude Opus (Anthropic)** — Réservé aux cas difficiles : explications fiscales nuancées, raisonnement multi-étapes (composer une déclaration complète à partir de plusieurs sorties d'outils). Coût et latence plus élevés, donc à appeler sélectivement, pas comme défaut.

**K2-Think-v2 (MBZUAI / K2Think)** — Modèle de raisonnement open-weight utilisé dans le MVP actuel (`LLM_PROVIDER=k2think`). Avantage : accès gratuit, modèle de raisonnement avec blocs `<think>` explicites (strippés avant réponse finale par `_strip_think()`). Limite : fiabilité du tool-calling inférieure aux frontiers sur des requêtes ambiguës.

**GPT-4o (OpenAI)** — Alternative crédible comme défaut d'orchestration : multimodalité, faible latence, fiabilité du function-calling éprouvée. À conserver comme fournisseur de repli pour éviter le lock-in fournisseur.

**GPT-4.1 (OpenAI)** — Suivi d'instructions solide et bon contexte long ; utile quand une requête demande de traiter de gros extraits (bulletins de paie, extraits comptables multi-lignes). Coût à comparer avec Sonnet pour le rôle de défaut.

**Gemini 2.5 (Google)** — Profil contexte-long et coût compétitif ; viable pour des requêtes simples à fort volume et sensibles au coût.

**Llama / Mistral (open-weights)** — Stratégiques, pas le défaut pour la qualité d'orchestration, mais ils permettent le **self-hosting** — réponse directe au problème de confidentialité et de résidence des données. Mistral a une empreinte francophone pertinente pour les tâches en français. À mesure que le volume grandit, router les requêtes simples ou sensibles vers un modèle auto-hébergé réduit à la fois le coût et l'exposition réglementaire.

---

## 4. Recommandation pour ce produit

**Architecture hybride, fournisseur abstrait :**

1. **MVP aujourd'hui :** K2Think (K2-Think-v2) comme fournisseur actif par défaut — accès gratuit, modèle de raisonnement. Claude Sonnet comme alternative recommandée en production pour la fiabilité du tool-calling. Les deux sont disponibles par simple changement de `LLM_PROVIDER` dans `.env`.

2. **Escalade sélective :** router les raisonnements complexes vers Claude Opus ou GPT-4.1 uniquement quand nécessaire, pour maîtriser le coût moyen par requête.

3. **À l'échelle / données sensibles :** introduire un modèle ouvert auto-hébergé (Llama ou Mistral) pour les workflows touchant aux données personnelles, afin que ces données ne quittent jamais une infrastructure contrôlée.

**La décision la plus importante : ne pas se verrouiller à un seul fournisseur.** La couche `provider.py` abstrait l'appel LLM dès le premier jour (ABC + 3 adaptateurs : Anthropic, OpenAI, K2Think). Justification : le paysage des modèles change tous les mois ; les leaders en coût, qualité et conformité varient ; un produit à données fiscales ne peut être otage de la tarification ou de la politique de données d'un seul vendeur.

---

## 5. Confidentialité, RGPD et conformité eGov

C'est là qu'un produit eGov diffère d'une app IA générique.

- **Minimisation des données.** N'envoyer au modèle que le nécessaire. Quand c'est possible, valider et calculer localement (les moteurs déterministes) sans passer d'identifiants personnels bruts à un modèle tiers. Le *format* d'un matricule CNPS peut être validé sans qu'un LLM le voie.

- **Résidence / transfert des données.** Les fournisseurs US hébergés soulèvent des questions de transfert transfrontalier pour des données personnelles d'employés camerounais. Pour un système eGov en production, c'est une vraie contrainte réglementaire — c'est l'argument central en faveur du self-hosting des workflows sensibles.

- **Rétention & opt-out.** Utiliser les options zéro-rétention / sans-entraînement des fournisseurs pour toute requête portant des données personnelles ; documenter le tier de fournisseur sur lequel on s'appuie.

- **Auditabilité.** Chaque exécution d'outil est loggée (outil, source, latence, statut). Pour la conformité, on garde une trace de ce qui a été calculé sans sur-conserver les entrées personnelles.

---

## 6. Self-hosting

- **Quoi auto-héberger :** l'orchestrateur pour les flux à données sensibles, avec un modèle ouvert (Llama/Mistral) sur une infrastructure contrôlée.
- **Pourquoi :** résidence des données, aucune exposition à un tiers, coût prévisible à fort volume.
- **Seuil :** n'en vaut la peine qu'au-delà d'un volume significatif ou quand la conformité l'exige. En dessous, les modèles hébergés avec réglages zéro-rétention sont le choix pragmatique.
- **Chemin :** la couche d'abstraction `provider.py` permet de brancher un modèle auto-hébergé par route (sensible vs non sensible) sans toucher au reste du système.

---

## 7. Feuille de route

| Étape | Posture LLM |
|---|---|
| MVP (maintenant) | K2Think par défaut (gratuit) + abstraction fournisseur. Claude Sonnet recommandé pour la production. |
| Croissance | Caching des requêtes récurrentes, routage des requêtes simples vers des modèles moins chers, escalade sélective vers Opus/GPT-4.1. |
| Conformité / échelle | Modèle ouvert auto-hébergé pour les workflows sensibles ; modèles hébergés pour le reste. |

**En résumé :** pour un assistant traitant des données fiscales et de paie camerounaises, *la confidentialité et l'indépendance vis-à-vis du fournisseur priment sur le dernier point de performance en benchmark*. La recommandation est un montage hybride et abstrait qui démarre simple et peut rapatrier le travail sensible en interne à mesure que le produit mûrit.
