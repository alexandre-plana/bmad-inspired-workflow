# L'accessibilité comme composition

Ce fichier ne remplace pas le standard accessibilité du projet. Il couvre les décisions structurelles qui doivent être prises avant l'implémentation.

## Gate

- ordre visuel et ordre logique cohérents ;
- navigation clavier possible ;
- focus visible et non masqué ;
- modal : entrée du focus, confinement si modal, sortie et retour de focus ;
- reflow sans perte de fonction dans les contraintes du produit ;
- cibles interactives suffisamment grandes selon le standard projet ;
- aucune information critique par couleur seule ;
- labels et rôles sémantiques prévus ;
- erreurs associées au contrôle concerné ;
- header/footer sticky ne masquant pas le focus ou le contenu à zoom élevé.

## Priorité

Si le projet impose une exigence plus forte (taille cible, contraste, environnement opérationnel), elle remplace le minimum générique.
