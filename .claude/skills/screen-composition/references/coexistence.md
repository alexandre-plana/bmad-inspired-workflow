# Coexistence avec un skill UI/UX projet

## Séparation des responsabilités

`screen-composition` répond à :

> Quelle structure fonctionnelle aide le mieux l'utilisateur à comprendre, décider et agir ?

Une référence ou un skill UI/UX projet répond à :

> Comment cette structure doit-elle être matérialisée dans CE produit, sous SES normes, SON design system et SES contraintes ?

## Règle de priorité

1. Doctrine, réglementation, sécurité et standards métier que le projet déclare **non surchargeables**. Une demande explicite ne les lève pas ; elle devient un écart à arbitrer.
2. Exigences explicites de la tâche, dans les limites fixées par 1.
3. Maquette contractuelle / oracle du projet, dans les limites fixées par 1–2.
4. Design system, composants et conteneurs imposés par le projet.
5. Recommandations de `screen-composition`.
6. Préférences esthétiques ou choix libres.

Le niveau 5 ne surcharge jamais 1–4. Si le projet ne déclare aucune doctrine non surchargeable, les niveaux 1 et 2 fusionnent et les exigences explicites de la tâche priment.

## Conteneurs imposés

Beaucoup de produits n'offrent pas librement les cinq surfaces génériques (inline, popover, panel, modal, page) : un shell impose ses tuiles, ses overlays, ses modales socle et ses classes de distance d'affichage. Dans ce cas :

- le conteneur est une **contrainte d'entrée** (`PROJECT CONSTRAINTS`), pas une décision ;
- l'algorithme de `surface-selection.md` ne décide que l'**intérieur** du conteneur (maître-détail inline, accordéon, section repliable, progressive disclosure) ;
- le conteneur se nomme avec la **table de correspondance** du skill projet (surface générique → conteneur du produit), jamais avec le vocabulaire générique seul.

## Handoff

Le contrat de sortie de `SKILL.md` **est** le handoff : il se transmet tel quel au skill projet, sans reformulation. Ne pas imposer de composant concret, bibliothèque de chart, token ou palette si le projet possède déjà une autorité sur ce choix.

Deux familles d'écarts, deux circuits :

| Écart | Quand | Qui tranche | Où |
|---|---|---|---|
| **de composition** : reco générique ↔ contrainte projet, maquette ↔ backend, incohérence interne de la maquette, plan ↔ code | avant le code | l'utilisateur | clé `GAPS TO ARBITRATE` du contrat |
| **d'implémentation** : la matérialisation ne peut pas atteindre la maquette (doctrine, manque du design system) | pendant le code | le protocole d'écart du skill projet | rapport d'implémentation |

Ne jamais faire passer un écart de composition par le circuit d'implémentation : il serait tranché trop tard, par la mauvaise personne.

## Maquettes existantes

Si une maquette est déclarée contractuelle :

- ne pas substituer un nouveau layout au layout fourni ;
- utiliser ce skill pour expliciter sa logique, détecter un problème UX demandé, ou combler une zone non spécifiée ;
- toute proposition de divergence est présentée comme une **refonte** ou un **écart à arbitrer**, jamais comme une correction silencieuse.

## Cas où ne pas charger ce skill

- simple application d'un composant déjà décidé ;
- correction CSS / token / palette ;
- migration de bibliothèque UI ;
- implémentation fidèle d'une maquette complète sans question de composition ;
- logique métier/backend ;
- rendu tactique spécialisé régi par une autre doctrine.
