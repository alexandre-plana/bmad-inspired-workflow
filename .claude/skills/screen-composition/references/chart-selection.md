# Choix du graphique

Choisir selon la **question analytique**.

| Question | Défaut | Alternatives / notes |
|---|---|---|
| comparer des catégories | barres horizontales triées | dot plot, lollipop |
| classement | barres/dots triés | bump chart si rang dans le temps |
| évolution temporelle | line chart | area si cumul pertinent ; small multiples |
| écart à une cible/zéro | barres divergentes | bullet, slope |
| distribution | histogramme | box plot, violin, dot strip |
| relation entre 2 variables | scatter | bubble si 3e variable indispensable |
| part du total | 100% stacked bar | pie/donut seulement avec très peu de catégories |
| géographie | carte si la position explique le phénomène | choroplèthe/symbol map |
| flux entre étapes/catégories | funnel ou Sankey selon la nature du flux | ne pas utiliser un funnel pour une simple série décroissante |
| valeur exacte | table | table + highlights |
| KPI actuel | valeur + unité + référence + variation | sparkline |
| progression bornée | progress bar / bullet | gauge seulement si lecture unique instantanée utile |

## Règles

- Les barres quantitatives ordinaires partent généralement de zéro.
- Une line chart suppose une dimension ordonnée/continue, typiquement le temps.
- Utiliser une table quand la précision exacte prime sur la perception de forme.
- Ne pas multiplier les gauges ou pies dans un dashboard dense.
- Ne pas utiliser la couleur comme seul canal sémantique.
- Ajouter référence, cible, seuil ou période précédente lorsque cela donne le sens de la valeur.
- Pour un dashboard, commencer par les écarts, anomalies ou décisions, pas par une grille uniforme de KPI.
