# Attribution de Ponytail

Les fichiers officiels `skills/ponytail/SKILL.md`, `skills/ponytail-review/SKILL.md` et `LICENSE` de Ponytail 5.0.0, de DietrichGebert, sont conservés sans modification sous `third_party/ponytail/`. Les agents chargent ces sources directement ; leurs adaptateurs locaux gèrent uniquement l'interface avec le workflow.

- Source : [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail/tree/v5.0.0).
- Version : `v5.0.0`, commit `b088b2df6e08d4306c6a3c3d575fe38c2d2d2989`.
- Copies : [ponytail](third_party/ponytail/skills/ponytail/SKILL.md) et [ponytail-review](third_party/ponytail/skills/ponytail-review/SKILL.md).
- Version et empreintes : [upstream-lock.json](third_party/ponytail/upstream-lock.json).
- Notice MIT d'origine : [third_party/ponytail/LICENSE](third_party/ponytail/LICENSE).

Les différences d'interface sont explicites dans [PONYTAIL_INTEGRATION.md](docs/PONYTAIL_INTEGRATION.md) : contexte d'invocation, autorisations, langue des rapports, champs du suivi et contrôles indépendants. Les hooks et le plugin complet ne sont pas installés.

La notice MIT accompagne les fichiers de Ponytail ; elle n'attribue pas une nouvelle licence à l'ensemble du workflow extrait.
