# Attribution de Ponytail

La distribution source complète de Ponytail 5.0.0, de DietrichGebert, est conservée sans modification sous `third_party/ponytail/` : 199 fichiers officiels, dont les six skills, hooks, adaptateurs d’hôtes, documentation, exemples, benchmarks et tests. Son historique Git n’est pas importé. Le seul ajout local dans ce dossier est `upstream-lock.json`. Les agents et l’adaptateur `ponytail-tools` chargent directement les sources requises ; ils gèrent uniquement l’interface avec notre workflow.

- Source : [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/v5.0.0).
- Version : `v5.0.0`, commit `b088b2df6e08d4306c6a3c3d575fe38c2d2d2989`.
- Copies : [distribution officielle](third_party/ponytail/README.md), [ponytail](third_party/ponytail/skills/ponytail/SKILL.md), [review](third_party/ponytail/skills/ponytail-review/SKILL.md), [audit](third_party/ponytail/skills/ponytail-audit/SKILL.md), [debt](third_party/ponytail/skills/ponytail-debt/SKILL.md), [help](third_party/ponytail/skills/ponytail-help/SKILL.md) et [gain](third_party/ponytail/skills/ponytail-gain/SKILL.md).
- Version et empreintes : [upstream-lock.json](third_party/ponytail/upstream-lock.json).
- Notice MIT d'origine : [third_party/ponytail/LICENSE](third_party/ponytail/LICENSE).

Les différences d'interface sont explicites dans [PONYTAIL_INTEGRATION.md](docs/PONYTAIL_INTEGRATION.md) : contexte d'invocation, autorisations, langue des rapports, champs du suivi et contrôles indépendants. Les fichiers du plugin et des hooks sont embarqués ; aucun hook ou mode global n’est activé implicitement.

La notice MIT accompagne les fichiers de Ponytail ; elle n'attribue pas une nouvelle licence à l'ensemble du workflow extrait.
