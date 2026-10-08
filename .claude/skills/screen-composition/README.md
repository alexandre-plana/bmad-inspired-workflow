# screen-composition

Skill de raisonnement UX consacré à la **composition fonctionnelle** des écrans, dashboards, panneaux, drawers, dialogs et modales, **en amont** du skill UI/UX projet (`frontend-ui-ux` dans le projet cible).

Principe : composition générique d'abord, matérialisation conforme au projet ensuite. En cas de conflit, le projet gagne. Le partage des responsabilités, l'ordre de priorité et les deux circuits d'écart sont dans `references/coexistence.md` ; le contrat de sortie, qui sert de handoff, est dans `SKILL.md`.

## Fichiers

- `SKILL.md` — protocole court : principe, coexistence, workflow en dix étapes, contrat de sortie.
- `references/` — une règle par fichier, chargée depuis l'étape du workflow qui la cite.
- `examples/output-contract.md` — exemple complet de contrat.
- `evals/evals.json` — scénarios d'évaluation avec assertions, même format que `frontend-ui-ux`.

## Point d'accroche dans le projet cible

Routage dans `CLAUDE.md` : composition ou refonte structurelle → `screen-composition` **puis** `frontend-ui-ux`. Le livrable vit à côté de la maquette de l'écran, sous `documentation/mockups/<slug>/composition-<écran>.md`, et l'étape du plan qui porte l'écran le référence (cf. `plan-history-artifact-writer` § « Composition d'écran en entrée »). La table de correspondance surfaces génériques → conteneurs du projet cible est dans la section « Composition en amont » de `frontend-ui-ux`.
