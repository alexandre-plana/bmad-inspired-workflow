# Historique de planification

Ce répertoire contient les conventions et un historique initialement vide pour le projet qui adopte le workflow.

| Chemin | Contenu |
|---|---|
| `briefs/` | Besoins cadrés par `analyse-need` |
| `tasks/` | Plans de fonctionnalités, refontes, documentation et infrastructure |
| `fixes/` | Plans de correction |
| `executions/` | Journaux de clôture du documentaliste |
| `executions/.etat/` | Événements et instantanés locaux du suivi, ignorés par Git |
| `index.jsonl` | Index machine des plans, une entrée JSON par ligne |
| `INDEX.md` | Projection lisible de l'index |
| `benchmarks/` | Campagnes historiques de mesure des profils d'agents |

Les briefs et journaux ne sont pas ajoutés à l'index des plans dans la version extraite. Les templates de plans résident dans `.claude/skills/plan-history-artifact-writer/assets/`.
