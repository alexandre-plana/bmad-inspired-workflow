# Panels et modales

> Vocabulaire : ici « panel / drawer » désigne une surface **subordonnée** à un parent visible. Si, dans le produit, « panneau » désigne une tuile de premier rang sans parent (workspace à tuiles), garder l'anatomie header / body / footer et abandonner la sémantique de subordination : la tuile n'a pas de « contexte parent », elle a des voisines. Le détail *à l'intérieur* d'une tuile retrouve alors la logique panel / drawer ci-dessous.

## Panel / drawer

Anatomie abstraite :

```text
HEADER
- titre
- contexte bref
- fermeture
- action rapide optionnelle

BODY
- information / contrôles de la tâche

FOOTER (si nécessaire)
- sortie
- action primaire
```

Le panel doit compléter le contexte parent, pas devenir une mini-page par défaut.

### Panel non modal

Préférer lorsque l'utilisateur doit comparer ou interagir avec le contenu parent pendant la tâche.

### Panel overlay / modal

Utiliser seulement lorsque l'attention doit être concentrée ou que les interactions parent seraient dangereuses/ambiguës.

## Modal / dialog

- titre spécifique à la situation ;
- conséquence ou information nécessaire avant l'action ;
- peu d'actions ;
- issue claire ;
- contenu court ;
- pas de navigation profonde.

### Signaux qu'une modal est trop petite

- scroll important ;
- formulaire long ;
- plusieurs sections indépendantes ;
- comparaison complexe ;
- besoin de revenir constamment au parent ;
- sous-dialogues.

Dans ces cas, envisager panel large ou page dédiée (ou leur équivalent dans la table de correspondance du projet).

## Focus

Pour un dialogue modal : focus initial pertinent, focus contenu dans le dialogue, fermeture accessible, retour du focus au déclencheur lorsque pertinent.
