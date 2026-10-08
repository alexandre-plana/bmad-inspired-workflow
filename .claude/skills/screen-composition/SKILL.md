---
name: screen-composition
description: >-
  Raisonnement UX en amont pour décider la composition fonctionnelle d'un
  écran, dashboard, panneau, drawer, dialog ou modale AVANT tout choix visuel
  ou d'implémentation : quoi montrer, ordre de lecture, priorité P0–P4,
  surface, actions, table ou graphique, densité, états, progressive
  disclosure. À déclencher dès qu'on compose ou refond structurellement un
  écran ou un panneau, qu'on hésite entre modale / panneau / plein écran,
  qu'un dashboard semble surchargé ou qu'une maquette laisse des zones non
  spécifiées — même sans le mot « composition ». Produit un contrat abstrait
  remis aux règles UI/UX du projet si elles existent, puis à l’implémenteur.

  Ne PAS déclencher pour : implémenter ou styler un écran déjà composé, mapper
  vers un composant du design system, choisir palette / thème / token, corriger du
  CSS, migrer une librairie UI, implémenter fidèlement une maquette complète
  sans question de composition, le rendu spécialisé régi par ses propres
  règles, le backend ou la simulation.
---

# Screen Composition — composition fonctionnelle d'un écran

## Principe

Composer depuis la **tâche et la décision utilisateur**, jamais depuis une collection de composants.

Ce skill décide de la **structure fonctionnelle** : quoi montrer, dans quel ordre, à quel niveau de priorité, dans quelle surface et sous quelle forme. Il ne décide ni du langage visuel ni de l'implémentation : il ne nomme jamais un composant, une palette, un token ou une bibliothèque, sauf s'ils sont fournis comme contraintes par le projet.

## Autorité et coexistence

Les règles du projet ont toujours priorité : doctrine métier, normes, accessibilité renforcée, design system, composants imposés, maquettes contractuelles et conventions d'implémentation. L'ordre de priorité complet, le handoff, les deux circuits d'écart et les cas où ne pas charger ce skill sont dans `references/coexistence.md`.

Si le projet possède une référence ou un skill UI/UX autoritaire :

- `screen-composition` propose la structure fonctionnelle ;
- le skill projet contraint et matérialise cette structure ;
- toute contradiction se résout en faveur du skill projet, y compris face à une demande explicite quand le projet déclare une doctrine non surchargeable ;
- si le produit **impose ses conteneurs** (shell à tuiles, overlays, modales socle, écrans distants), l'algorithme de surface ne décide que **l'intérieur** ; le conteneur se nomme avec la table de correspondance du skill projet ;
- si une maquette est contractuelle, ne pas la redessiner sauf refonte demandée : expliciter sa logique, couvrir les zones non spécifiées, remonter les incohérences comme **écarts à arbitrer**.

## Workflow

Dix étapes, à proportionner à la surface : pour un dialog de confirmation ou un popover, une étape sans objet tient en une ligne « n/a ». Ne jamais sauter les étapes 1, 3, 4 et 7 — ce sont elles qui empêchent de composer depuis les composants.

1. **Établir le job** — utilisateur, contexte, tâche primaire, décision, succès, fréquence, risque, besoin de contexte parent. Format et discipline dans `references/task-model.md`.
2. **Inventorier** — informations, statuts, contrôles, actions, messages, navigation, aide. Pour chaque information, vérifier qu'elle **existe réellement** (contrat de données, backend, source) : composer sur une donnée absente produit un écart à arbitrer, pas un écran.
3. **Prioriser** — classer P0 à P4 avec `references/information-priority.md`.
4. **Choisir la surface** — inline, popover, panel/drawer, modal/dialog, page, ou conteneur imposé, avec `references/surface-selection.md` ; anatomie et signaux de dépassement dans `references/panels-and-modals.md`.
5. **Définir l'ordre de lecture** — contexte → état → information décisionnelle → action → détail, avec `references/reading-hierarchy.md`.
6. **Choisir la représentation** — texte, métrique, statut, liste, table, cards ou graphique avec `references/data-display.md` ; pour les données quantitatives, `references/chart-selection.md`.
7. **Architecturer les actions** — primaire, secondaire, tertiaire, destructive, sortie, ou **aucune** sur une surface de lecture seule, avec `references/action-architecture.md`.
8. **Définir les états utiles** — initial, loading, empty, success, error, partial/stale, disabled, permission, confirmation destructive, selon ce qui peut réellement se produire, avec `references/states-feedback-errors.md`.
9. **Passer le gate accessibilité, responsive et distance** — ordre logique, focus, clavier, reflow, cibles, alternatives à la couleur (`references/accessibility-composition.md`) ; petit écran, densité, lecture à distance, RTL (`references/responsive-and-rtl.md`).
10. **Critiquer une fois** — passer `references/anti-patterns.md` puis `references/review-checklist.md` ; supprimer le décoratif, réduire la concurrence visuelle, vérifier que la tâche primaire reste évidente.

## Contrat de sortie

Produire, dans cet ordre, toutes les clés (valeur « n/a » admise quand la clé est sans objet) :

- `PRIMARY TASK`
- `SUCCESS / DECISION`
- `PROJECT CONSTRAINTS` — données d'entrée du projet, non décidées ici (doctrine, maquette, conteneur imposé, contrat de données)
- `INFORMATION PRIORITY` — P0 à P4 pertinents
- `SURFACE + RATIONALE` — conteneur (imposé ou choisi), puis intérieur
- `READING ORDER`
- `ACTIONS` — « aucune » est une réponse valide ; une consigne adressée à l'humain est une information, pas un contrôle
- `DATA DISPLAY`
- `STATES`
- `ACCESSIBILITY / RESPONSIVE / DISTANCE`
- `WIREFRAME` — abstrait, sans composant
- `ASSUMPTIONS / RISKS` — trois au maximum
- `GAPS TO ARBITRATE` — sans limite : chaque écart entre la recommandation générique et une contrainte projet, entre la maquette et le backend, entre la maquette et son propre contrat, ou entre le plan et le code ; pour chacun, nature, constat, recommandation. Ces écarts se tranchent **par l'utilisateur avant le code** ; ils ne relèvent pas du protocole d'écart d'implémentation du skill projet.

Les clés sont des identifiants stables en anglais ; le contenu se rédige dans la langue du projet. Exemple complet dans `examples/output-contract.md`. Ce contrat **est** le handoff vers le skill projet : il se transmet tel quel, sans reformulation.

Ne pas produire de choix de couleurs, typographies, tokens, bibliothèques ou composants concrets sauf s'ils sont fournis comme contraintes par le projet.

Doctrine générique sous-jacente et références externes : `references/sources.md`.
