# Porter le workflow IA dans un autre projet

Les fichiers sous `.claude/` sont issus d'un projet applicatif, avec des noms neutralisés. Cette extraction rend le workflow accessible ; elle conserve des conventions métier à adapter avant de l'exécuter ailleurs.

## 1. Séparer méthode et règles du projet

Conserver le parcours brief → plan → étapes taggées → implémentation → revue → journal, les rapports structurés, la limite de trois itérations et la distinction entre état d'exécution et statut du plan.

Remplacer les références à `project-standards`, `project-architecture` et `frontend-ui-ux` par les règles réellement présentes dans le projet cible. Ces trois skills métier et leur documentation normative ne sont pas extraits : ils portent le domaine maritime et l'architecture de l'application.

Les invariants WGS-84, MQTT, Socket.io, OpenBridge, OTAN et les palettes maritimes présents dans les agents sont des règles du domaine source. Les grilles du vérificateur et de l'orchestrateur doivent être adaptées ensemble, ainsi que leurs champs de rapport.

`screen-composition` est facultatif. Il prépare la structure fonctionnelle des interfaces et reste subordonné au système de design du projet cible.

## 2. Adapter les périmètres et les rôles

| Dans le snapshot | À définir dans le projet cible |
|---|---|
| `[backend]`, `[docs]`, `[infra]` → backend-implementer | Chemins serveur, documentation et infrastructure autorisés |
| `[frontend]` → frontend-implementer | Chemins du client et système de design |
| `[station]`, `[contract]`, `[bord]` → station-implementer | Rôles et dépôts externes réellement utilisés, ou retrait de ces tags |
| `[simulator]` | Dépôt externe et commandes propres, si applicable |
| `[decision]` | Décision utilisateur explicite |
| `[firmware]` et gestes matériels | Travail manuel, si applicable |

Remplacer les chemins absolus `C:\DEV\xplor-station`, `C:\DEV\xplor-contracts` et `C:\DEV\maritime-drone-simulator`. Un agent ne doit jamais recevoir un périmètre d'écriture implicite dans un dépôt externe.

Le `frontend-implementer` source contient une ancienne interdiction du chemin `frontend/` pour la V1, alors que ce même chemin désigne désormais la V2 autorisée. Résoudre cette contradiction lors du portage : désigner un seul périmètre client actif et un éventuel chemin legacy distinct.

## 3. Choisir des modèles disponibles

Les variantes `opus-*` et `sonnet-*` sont conservées pour la fidélité et les comparaisons historiques. Leurs identifiants ne garantissent pas la disponibilité de ces modèles sur un autre compte ou moteur.

Commencer avec `--profile=herite` et les agents de base. Pour utiliser un profil épinglé ou `auto`, adapter conjointement les variantes et les tables de routage d'`execute-plan`, puis vérifier leur résolution sur la plateforme cible. Les métriques des benchmarks correspondent aux campagnes du projet source ; elles ne constituent pas une mesure du portage.

## 4. Adapter les outils et les contrôles

- Les fichiers d'agents sont au format Claude Code : `tools:`, `model:`, `effort:` et variantes déléguées. Un autre moteur doit traduire ce format et les appels d'agents.
- `mcp__codegraph`, Playwright et les outils `preview_*` sont des intégrations de la plateforme source. Installer les outils nécessaires ou remplacer ces contrôles par des équivalents disponibles.
- Remplacer les commandes npm et le cliquet de typage backend par les checks du projet. Un contrôle requis impossible à lancer doit être rapporté comme tel.
- Le CLI `run-tracker.mjs` est indépendant de ces intégrations et ne dépend que de modules intégrés à Node et de Git pour relever le commit de départ.
- Les scripts `*.workflow.js` des benchmarks nécessitent le moteur Workflow de leur environnement d'origine ; ce ne sont pas des scripts Node autonomes.

## 5. Conserver le contrat du suivi

Le CLI utilise par défaut `documentation/history/executions/.etat/` dans le dépôt contenant l'outil. `--root <checkout>` permet de viser un autre checkout.

Le suivi utilise le schéma `workflow-run-state/1`, la clé `project` pour le dépôt principal et la variable `WORKFLOW_REPO_ROOT`. Le CLI, les tests et les exemples utilisent ces mêmes identifiants. Tout lecteur externe ou état créé avant cette neutralisation doit être adapté à ces nouveaux noms ; les dépôts externes se déclarent via `repos`.

L'orchestrateur est l'unique auteur de l'état. Les agents d'implémentation ne le modifient pas. Le documentaliste lit l'instantané à la clôture mais écrit uniquement le journal Markdown.

## 6. Initialiser l'historique

Conserver la structure fournie dans `documentation/history/`. `INDEX.md` et `index.jsonl` sont vides au départ ; ne pas importer les index, plans et journaux réels du projet d'origine.

Fusionner dans les consignes du projet : nouveau besoin → `analyse-need` ; planification → `plan-history-artifact-writer` ; grand plan → `shard-plan` ; exécution d'un plan existant → `execute-plan`. Une autorisation déjà donnée par l'utilisateur continue de s'appliquer.

Valider ensuite un petit plan contenant une implémentation, sa vérification, une décision utilisateur et une clôture. Vérifier que l'état et le journal reflètent les faits observés ; un test du CLI ne valide pas le comportement de tous les agents.
