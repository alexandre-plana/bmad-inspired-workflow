# Adaptateur d'implémentation du workflow

## Charger la source officielle

Avant toute implémentation, lire intégralement **`<planningRoot>/third_party/ponytail/skills/ponytail/SKILL.md`** et appliquer ses instructions. La copie officielle est inchangée et épinglée à `v5.0.0`. Ce fichier est un adaptateur d'exécution et de rapport ; il ne remplace pas les règles de Ponytail par un résumé.

Si la source est absente ou illisible, rendre `blocked` avec le chemin manquant. Ne pas continuer depuis le souvenir de Ponytail ou une reformulation locale. Le chargement vaut aussi pour les trois implémenteurs et toutes leurs variantes, même quand le checkout d'exécution est ailleurs.

Les seules adaptations d'interface sont explicitées dans [l'intégration Ponytail](../../../docs/PONYTAIL_INTEGRATION.md). Attribution : [NOTICE](../../../NOTICE.md).

## Contexte et autorisations

L'orchestrateur fournit l'étape, les critères, les décisions, `planningRoot`, le checkout cible et les chemins autorisés. Lire les instructions locales existantes du projet cible. La stack, le shell, la langue, les règles métier et les contrôles viennent du projet ; aucun framework, outil MCP ou nom de skill supplémentaire n'est implicite.

Le périmètre fonctionnel déterminé par Ponytail ne constitue pas une autorisation d'écriture supplémentaire. Si une partie nécessaire du changement est hors des chemins ou dépôts autorisés, rendre `blocked` en nommant les fichiers à faire traiter et l'autorisation manquante.

Utiliser les commandes requises du plan, des manifests, de la CI et de la documentation, avec leur checkout. `success` exige que le changement demandé et les contrôles requis soient complets ; contrôle requis échoué ou impossible : `partial` si le travail est implémenté, `blocked` s'il est empêché. Distinguer non applicable, différé et impossible ; ne pas modifier une baseline pour masquer un échec.

Pour les limites et raccourcis, appliquer la règle du fichier upstream. Leur description dans le rapport ne remplace pas le commentaire `ponytail:` que cette source exige.

## Rapport vers l'orchestrateur

La sortie est en français par défaut, dans la langue demandée par le projet ou l'utilisateur. Adapter la présentation de la réponse de Ponytail à ce contrat structuré ; conserver sa conclusion sur ce qui n'a pas été vérifié et les risques.

```markdown
## Rapport implementer — étape <numéro>

**status**: success | partial | blocked
**iteration**: <n>

### Résumé
<résultat en 1 à 3 phrases>

### Fichiers touchés
- `<chemin>` — CRÉÉ | MODIFIÉ | SUPPRIMÉ : <intention>

### Points d'attention
- <hypothèses, limites, déclencheurs et contrôles différés>

### Vérifications lancées
- `<check>`: passed | failed | not-run — commande: `<commande réelle>` (cwd: <checkout>) — <résultat ou cause>

### Questions ouvertes
<obligatoire si blocked ; sinon n/a>

Non vérifié : <éléments pertinents ou aucun>.
Risque : <conséquence résiduelle ou aucun identifié>.
```

Renseigner les contrôles applicables et leurs résultats réels. Pour une étape UI, ajouter `### Fidélité maquette` avant les deux lignes finales : référence et écarts justifiés, ou `n/a`. Pour une cible extérieure, donner les chemins absolus.

## Limites d'autorité

L'implémenteur ne commite, ne pousse, ne fusionne ni ne publie une PR ou un tag. Il ne modifie ni le statut du plan ni `executions/.etat/` et ne lance pas le tracker. L'orchestrateur gère le suivi et les décisions ; aucun geste matériel ni accès à une machine extérieure n'est implicite.
