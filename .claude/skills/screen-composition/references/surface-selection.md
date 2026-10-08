# Choix de la surface

Choisir le conteneur avant de choisir les composants — ou constater qu'il est imposé.

## Conteneur imposé

Si le produit impose ses conteneurs (shell à tuiles, overlays système, modales socle, écrans distants), le conteneur est une contrainte d'entrée. L'algorithme ci-dessous ne s'applique alors qu'à l'**intérieur** du conteneur : maître-détail inline, accordéon, section repliable, popover d'aide. Le conteneur se nomme avec la table de correspondance du skill projet (voir `coexistence.md`).

| Surface | Utiliser quand | Éviter quand |
|---|---|---|
| Inline | action locale, simple, fréquente | workflow long ou forte isolation |
| Popover | aide/choix bref ancré à un élément | contenu critique, long, multi-étape |
| Panel / drawer | tâche secondaire liée au parent ; contexte parent utile | tâche longue, largeur importante, exploration profonde |
| Modal / dialog | réponse immédiate requise ; tâche courte ; interruption justifiée | tâche fréquente, longue saisie, navigation, comparaison riche |
| Page dédiée | workflow complexe, long, partageable, multi-étape ou riche en données | micro-action locale |

## Algorithme

```text
IF container is imposed by the product
  → decide the interior only (see above)
ELSE IF local + simple + frequent
  → inline
ELSE IF contextual AND parent context must remain available
  → panel/drawer
ELSE IF response is required before continuing
     AND task is short
     AND interruption is justified
  → modal/dialog
ELSE IF brief + anchored to one control
  → popover
ELSE
  → dedicated page
```

## Escalader vers une page si

- le nombre d'étapes augmente ;
- le contenu ou les champs exigent un scroll important ;
- la comparaison demande beaucoup de largeur ;
- l'utilisateur a besoin d'un deep link, d'un historique ou d'une navigation interne ;
- la tâche est fréquente ;
- plusieurs zones du parent doivent rester consultables ;
- le coût d'erreur ou la charge cognitive augmente.

Dans un produit sans notion de page (application mono-écran, workspace à tuiles), « page » se lit « surface plein écran ou vue dédiée du produit » : appliquer la table de correspondance du skill projet.

## Modalité

Une modal est un **coût d'interruption**. Ne jamais la choisir uniquement parce qu'elle est techniquement disponible.

Éviter les modales imbriquées. Pour une sous-tâche, préférer progresser dans le même dialogue, revenir au parent ou changer de surface.
