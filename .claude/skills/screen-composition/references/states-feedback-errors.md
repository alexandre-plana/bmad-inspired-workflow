# États, feedback et erreurs

Définir uniquement les états qui peuvent réellement se produire et changer la compréhension ou l'action.

| État | Réponse attendue |
|---|---|
| Initial | point de départ et affordance claire |
| Loading | activité/progression sans blocage inutile |
| Empty | raison de l'absence + prochaine action si pertinente ; sur une surface de lecture seule, raison seule, sans appel à l'action inventé |
| Success | confirmation reliée au nouvel état |
| Error | cause compréhensible + récupération/retry **si une voie de récupération existe réellement** + saisies préservées ; sinon cause + consigne, jamais un bouton inerte |
| Partial/stale | signal explicite de données partielles ou périmées ; âge visible, seuil de péremption explicite ; relevé gelé plutôt que masqué |
| Disabled | condition d'activation compréhensible si utile |
| Permission | raison + voie de résolution |
| Destructive confirm | objet + conséquence + réversibilité + action explicite |

## Proximité du feedback

- problème local → feedback local près de la cause ;
- problème global → message global ;
- plusieurs erreurs locales → résumé global possible + erreurs au point d'usage.

Ne pas transformer toute notification en toast. La surface de feedback dépend de son importance, sa persistance et son lien avec le contexte. Si le produit possède un canal canonique de notification ou une hiérarchie d'alerte normée, la surface et le niveau du feedback sont imposés par lui : les déclarer en contrainte, ne pas les recomposer.
