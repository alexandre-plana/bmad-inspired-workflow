# Responsive, densité, distance et RTL

## Responsive

Ne pas simplement « empiler » un desktop.

Pour chaque groupe, décider :

- **Keep** : indispensable, reste visible.
- **Compress** : même information sous forme plus compacte.
- **Collapse** : détail secondaire replié.
- **Move** : déplacé vers une surface secondaire.
- **Remove** : décoratif/redondant supprimé.

Un panel desktop peut devenir une surface pleine hauteur/largeur sur petit écran si la tâche le nécessite. Une modal longue est un signal de réévaluation de la surface. Si le produit publie des paliers (largeur, hauteur), composer sur ces paliers et jamais sur un seuil inventé.

## Densité

La densité dépend de l'expertise, de la fréquence et du contexte opérationnel. Un outil expert fréquent peut être dense sans être confus si la hiérarchie et l'alignement restent stables.

## Lecture à distance

Un écran peut être lu **de loin** (mur d'écrans, poste partagé, affichage de salle) : le facteur n'est plus la largeur mais la **distance** et l'absence d'interaction. Décider par groupe, comme pour le petit écran, avec un tri différent :

- **Keep** : verdict, état, identité, âge — ce qui se lit en un coup d'œil ;
- **Amplify** : échelle des libellés et des signaux d'état, contraste, espacement ;
- **Remove** : contrôles, détails, aide, tout ce qui suppose une main sur la souris ;
- un détail qui ne peut pas s'ouvrir de loin ne doit pas exister de loin : la surface distante montre la liste ou le résumé, jamais un état « sélectionné » inerte.

Si le produit expose une classe de distance (près / loin) ou un type d'écran distant, la déclarer comme contrainte et composer les deux lectures dès le contrat, plutôt que de dériver la lecture lointaine après coup.

## RTL

- adapter la direction des groupes et contrôles lorsque conventionnel ;
- préserver les relations sémantiques ;
- vérifier icônes directionnelles, progression, chevrons et navigation ;
- ne pas inverser les données dont le sens intrinsèque est indépendant de la langue sans justification.

Sans objet si le produit ne cible aucune langue RTL : ne pas dépenser d'effort dessus.
