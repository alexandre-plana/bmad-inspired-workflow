# Porter le workflow IA dans un projet

Le parcours brief → plan → implémentation → vérification → journal est indépendant du domaine. Les agents ne fixent ni stack, ni norme sectorielle, ni chemins applicatifs. Le plan et les instructions du projet cible fournissent ces contraintes.

## 1. Fournir le contrat du projet

Déclarer le checkout d'exécution, les chemins autorisés, les critères d'acceptation, les instructions locales et les contrôles avec leur répertoire. Lire les manifests et la CI pour choisir les commandes : pytest/ruff pour un projet Python, cargo test pour un projet Rust, scripts du package pour un client web, par exemple. Aucun de ces exemples n'est obligatoire.

Les skills métier et outils supplémentaires ne sont chargés que s'ils existent et sont pertinents. Le compagnon `screen-composition` est facultatif et suit le système de design et les maquettes du projet.

## 2. Définir rôles et dépôts

| Tags | Agent | Périmètre à fournir |
|---|---|---|
| `[backend]`, `[docs]`, `[infra]`, `[simulator]` | backend-implementer | Chemins serveur, outils, documentation ou infrastructure |
| `[frontend]` | frontend-implementer | Chemins du client, composants existants, maquette et contrôles UI |
| `[station]`, `[contract]`, `[bord]` logiciel | station-implementer | Checkout d'intégration ou de contrats autorisé |
| `[decision]` | Utilisateur | Décision à prendre |
| `[firmware]`, `[bord]` matériel | Manuel | Geste matériel, seulement si applicable |

Un tag ne détermine pas le dépôt. Sans champ `repo`, une étape appartient à `project`. Une étape externe reçoit un `repo` explicite, déclaré dans `repos`, et son périmètre d'écriture. Le dépôt de planification reste en lecture seule pour un agent exécutant ailleurs. Fournir `planningRoot` pour qu'il lise les agents et leur contrat commun au bon emplacement.

Exemple d'extrait d'entrée d'initialisation du suivi :

```json
{
  "repos": { "integration": "/chemin/absolu/payments-adapter" },
  "steps": [
    { "id": "1", "tag": "backend", "title": "Adapter le calcul" },
    { "id": "2", "tag": "contract", "repo": "integration", "title": "Adapter le contrat" }
  ]
}
```

Cet extrait complète les autres métadonnées requises par [run-tracker](../tools/history/README.md). Les clés de dépôt des anciennes fixtures sont des exemples, pas un mapping imposé.

## 3. Installer les instructions

Copier les quatre skills du cœur avec leurs `assets/` et `evals/`, les agents nécessaires et **`.claude/agents/references/implementation.md`**. Les variantes dépendent de leur agent de base. Conserver aussi [NOTICE](../NOTICE.md) et `third_party/ponytail/LICENSE` lors de la redistribution des adaptations de Ponytail.

Copier `tools/history/` et les conventions de `documentation/history/`, en gardant les index vides. Fusionner le routage dans le `CLAUDE.md` existant : nouveau besoin → `analyse-need`, planification → `plan-history-artifact-writer`, grand plan → `shard-plan`, exécution → `execute-plan`. Les autorisations déjà données par l'utilisateur continuent de s'appliquer.

Les fichiers d'agents utilisent le format Claude Code (`tools:`, `model:`, `effort:`). Un autre moteur doit traduire ce format et les appels d'agents. Commencer par `--profile=herite` ; les profils épinglés exigent des modèles disponibles. Les benchmarks et scripts `*.workflow.js` conservés dépendent de leur environnement historique.

## 4. Vérifier le portage

```powershell
node --test tools/history/run-tracker.test.mjs
```

Exécuter ensuite un petit plan réel avec une implémentation, une vérification, une décision et une clôture. Contrôler les permissions, les commandes et le journal. Les [évaluations d'agents](../evals/agents/README.md) sont des simulations de décisions, pas une campagne d'exécution sur toutes les stacks.

Le verifier doit lire les consommateurs hors du diff quand une interface change et relancer indépendamment les contrôles requis. Un contrôle requis impossible est bloquant ; un contrôle non applicable doit être distingué d'un contrôle reporté au final. La boucle de correction reste limitée à trois itérations.

## 5. Préserver le suivi

Le CLI utilise le schéma `workflow-run-state/1`, la clé principale `project` et la variable `WORKFLOW_REPO_ROOT`. Il écrit par défaut dans `documentation/history/executions/.etat/` ; `--root <checkout>` permet de viser un autre checkout.

L'orchestrateur est l'unique auteur de l'état. Les agents rendent des rapports ; le documentaliste lit l'instantané et écrit seulement le journal Markdown. Le statut du plan, celui du rapport implementer et le verdict verifier restent distincts.
