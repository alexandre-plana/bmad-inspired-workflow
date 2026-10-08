# Architecture des actions

## Types

| Type | Rôle |
|---|---|
| Primary | fait avancer la tâche principale |
| Secondary | alternative utile dans la même décision |
| Tertiary | aide, navigation, action rare |
| Destructive | conséquence sévère ou irréversible |
| Cancel / Close | sortie sans accomplir l'action |

## Règles

- Une décision doit avoir une action dominante identifiable — sauf surface sans action (ci-dessous).
- Le label décrit l'effet : `Publier`, `Enregistrer les modifications`, `Supprimer le projet`.
- Éviter `OK`, `Valider`, `Submit` quand un résultat précis peut être nommé.
- Une action destructive doit être distinguée proportionnellement au risque et ne pas être placée de façon à encourager l'erreur.
- Ne pas imposer universellement primary-left ou primary-right : suivre la convention du produit/design system.
- L'ordre clavier doit rester logique et stable.
- Si l'utilisateur doit connaître une information pour agir, placer cette information près de l'action.

## Surface sans action

Une surface de **supervision ou de lecture seule** n'a pas d'action primaire, et il ne faut pas en inventer une. La règle « une décision doit avoir une action dominante » vaut pour les surfaces où l'utilisateur agit dans le produit ; sur une surface de constat :

- `Primary — aucune` est la réponse attendue, écrite explicitement ;
- la « décision » aboutit souvent à une **consigne adressée à l'humain** (« aucune action requise », « vérifier le récepteur partenaire ») : c'est une information P0, pas un contrôle ;
- pas de bouton de récupération (Réessayer, Reconnecter) si aucune route ni autorité ne le porte — un bouton sans effet réel est un mensonge d'interface ;
- une navigation vers la surface où l'action existe (autre panneau, console) reste possible comme action tertiaire ;
- si le produit sépare connectivité et autorité de contrôle, une action de contrôle n'apparaît que lorsque l'autorité est établie.
