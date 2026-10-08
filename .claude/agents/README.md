# Équipe d'agents

Les agents sont invoqués par [execute-plan](../skills/execute-plan/SKILL.md). L'orchestrateur garde le dialogue utilisateur et le suivi ; chaque agent reçoit le contexte complet de son invocation.

## Rôles

| Agent | Tags ou moment | Contrat |
|---|---|---|
| [backend-implementer](backend-implementer.md) | `[backend]`, `[simulator]`, `[docs]`, `[infra]` | Serveur, services, outils, documentation ou infrastructure dans les chemins autorisés par le plan |
| [frontend-implementer](frontend-implementer.md) | `[frontend]` | Interface du projet, composants existants, maquette et accessibilité |
| [station-implementer](station-implementer.md) | `[station]`, `[contract]`, `[bord]` logiciel | Intégration et contrats dans le checkout déclaré ; nom conservé pour compatibilité de routage |
| [verifier](verifier.md) | `[verify]`, après une étape, puis à la clôture | Revue indépendante, lecture au-delà du diff et contrôles du projet ; aucune correction du code |
| [documenter](documenter.md) | Une fois à la clôture | Journal Markdown dans `documentation/history/executions/` ; lecture seule de l'état |

Les implémenteurs et leurs variantes lisent le [contrat commun d'implémentation](references/implementation.md). Aucun framework, langage, norme sectorielle, chemin applicatif ou serveur MCP n'est requis implicitement. Les instructions locales et les critères du plan définissent le projet cible.

Un tag choisit un rôle, pas un dépôt. Le dépôt principal a la clé `project` ; une étape externe déclare sa clé `repo` et son checkout dans `repos`. Le prompt transmet `planningRoot`, le checkout d'exécution, les chemins autorisés et les contrôles avec leur répertoire. Un appelant nécessaire hors du périmètre d'écriture doit être signalé comme bloquant.

`[decision]` requiert une décision utilisateur. `[firmware]` et `[bord]` matériel restent manuels si le projet les utilise ; aucun agent ne reçoit un accès matériel implicite.

## Principes adaptés de Ponytail 5.0

- Livrer le plus petit changement complet : suivre les données et les appelants, réutiliser les composants existants, éviter les abstractions et dépendances spéculatives.
- Préserver la sécurité, l'accessibilité et les données ; documenter la limite d'un raccourci et son déclencheur de révision.
- Vérifier des comportements utiles avec les outils du projet. Un contrôle requis impossible ne devient jamais un succès.
- Le verifier recherche des défauts démontrables, notamment hors du diff et sous la charge attendue. Une préférence de style ne constitue pas un finding.

Attribution, version épinglée et licence : [NOTICE](../../NOTICE.md). Les hooks et modes globaux de Ponytail ne sont pas installés.

## Profils et variantes

Les profils conservés sont `auto`, `herite`, `opus-4-6`, `opus-4-8`, `opus-5`, `opus-5-5`, `opus-5-5-medium`, `sonnet-5-5` et `sonnet`. Leur table de résolution est dans [execute-plan](../skills/execute-plan/SKILL.md). Les variantes relisent l'agent de base depuis `planningRoot` ; elles changent uniquement le modèle et l'effort.

Le frontmatter `tools:` d'une variante n'hérite pas automatiquement du fichier de base : conserver les deux listes synchronisées. Les outils minimaux sont lecture/recherche/shell pour le verifier, avec écriture/édition pour les implémenteurs et le documentaliste. Les contrôles UI utilisent les moyens disponibles dans le projet.

Les identifiants de modèles dépendent du moteur et du compte cible. Commencer par `--profile=herite` pour un portage. Les [benchmarks conservés](../../documentation/history/benchmarks/execute-plan-profiles/README.md) sont historiques ; ils ne mesurent pas ces nouveaux contrats ni leur efficacité sur un autre projet.

## Rapports et convergence

Le contrat commun définit le rapport implementer (`success`, `partial`, `blocked`). Le [verifier](verifier.md) définit le rapport de contrôle (`pass`, `pass-with-notes`, `fail`) et ses modes : `docs-config` pour le strictement statique, `step` pour le comportement exécutable, `final` pour les contrôles complets requis.

La boucle implementer → verifier reste limitée à trois itérations par étape ; un échec persistant remonte à l'utilisateur. L'orchestrateur publie les transitions avec [run-tracker](../../tools/history/README.md). Les agents ne modifient ni le statut du plan ni l'état du suivi et ne committent, ne poussent ou ne fusionnent aucun changement.

Les cinq [scénarios d'évaluation](../../evals/agents/README.md) contrôlent la portabilité et les décisions attendues des nouveaux contrats.
