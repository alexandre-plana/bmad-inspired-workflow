# Règles communes d'implémentation

Ces règles sont obligatoires pour les trois implémenteurs et leurs variantes. Elles adaptent les principes de Ponytail 5.0.0 à l'exécution d'un plan et à son rapport structuré. Attribution : [NOTICE](../../../NOTICE.md).

## Comprendre l'étape et son périmètre

Lire l'étape, les critères d'acceptation, les décisions déjà prises, le dépôt et les chemins autorisés transmis par l'orchestrateur. Lire les instructions du projet cible qui existent (`AGENTS.md`, `CLAUDE.md`, documentation locale pertinente). Le projet détermine la langue, la stack, le shell, l'architecture, les règles métier et le système de design.

Une skill métier ou un outil d'indexation est utilisé s'il existe et s'applique. Aucun nom de skill, framework, norme métier ou serveur MCP n'est un prérequis implicite. Si une règle explicitement requise par le plan manque, signaler précisément ce manque à l'orchestrateur.

Avant d'écrire, lire le code concerné et suivre le flux réel. Rechercher tous les appelants lorsqu'une signature, un champ, un retour ou un comportement change, y compris les références textuelles ou dynamiques. Identifier les tests, fixtures, exports, configurations et migrations qui doivent évoluer avec ce changement.

La portée fonctionnelle comprend tout ce qui est nécessaire pour que l'étape soit complète. Le droit d'écriture reste celui des chemins et dépôts autorisés : si un appelant nécessaire est ailleurs, rendre `blocked` et nommer l'extension de périmètre ou l'étape complémentaire nécessaire. La lecture des dépendances est permise dans les limites données par l'orchestrateur.

## Choisir la solution la plus petite qui satisfait le besoin

Dans cet ordre :

1. Conserver uniquement les fonctionnalités et comportements demandés, sans option « pour plus tard ».
2. Réutiliser le helper, composant, service ou pattern déjà présent dans le projet.
3. Utiliser la bibliothèque standard ou une fonction de la plateforme, en respectant les abstractions existantes du projet. Un composant maison approprié passe avant un widget natif.
4. Utiliser une dépendance déjà installée. Ajouter une dépendance seulement si le besoin la justifie et si l'étape l'autorise ; quelques lignes simples ne justifient pas un nouveau package.
5. Écrire le code minimal lisible restant. Une expression courte qui demande à être déchiffrée n'est pas une simplification.

Conserver les couches, interfaces et conventions existantes. Corriger la cause commune d'un bug plutôt que chaque appelant séparément. Retirer le code devenu inutile lorsqu'il appartient au changement ; éviter les refontes opportunistes, wrappers et configurations spéculatives. Préserver les validations et la gestion d'erreurs lors d'un déplacement ou d'une fusion de code.

Le gain de lignes ne justifie jamais de supprimer un comportement demandé, un contrôle de sécurité, une validation à une frontière de confiance, une protection contre la perte de données ou une exigence d'accessibilité. Vérifier les cas limites et la charge réellement attendue, notamment l'état partagé, la concurrence et les écritures persistantes.

## Vérifier le changement complet

Déduire les commandes du plan, de la CI, des manifests et de la documentation du projet : par exemple pytest/ruff, cargo test ou les scripts du package. Ne pas supposer que le projet utilise npm, qu'il possède un frontend, ou qu'une étape nécessite un build.

Pour une logique nouvelle non triviale ou un correctif, ajouter ou adapter un petit test qui détecte le défaut pertinent, dans l'infrastructure existante. Un test déjà pertinent peut suffire ; les changements triviaux n'exigent pas un test qui recopie l'implémentation. Couvrir les appelants et fixtures affectés. Ne pas introduire un framework de test pour satisfaire une case.

Exécuter les contrôles applicables et exigés dans le bon checkout. Un contrôle requis indisponible ou échoué empêche `success` : rendre `blocked` si le travail est empêché, `partial` s'il est implémenté mais non validé. Distinguer « non applicable » de « requis mais impossible », préciser la commande, le répertoire et la cause. Ne pas masquer une erreur, désactiver un test ou relever une baseline pour faire passer un contrôle.

Un raccourci assumé doit indiquer sa limite et le déclencheur d'une révision, dans le rapport ; un commentaire `ponytail: <limite>; revoir quand <déclencheur>` est possible si l'intention ne se lit pas dans le code. Il ne dispense jamais des critères d'acceptation.

## Rapport vers l'orchestrateur

Conserver les champs de `execute-plan`. `success` signifie que l'étape est complète et que ses contrôles requis ont réussi ; seul le verdict indépendant du vérificateur valide l'étape.

```markdown
## Rapport implementer — étape <numéro>

**status**: success | partial | blocked
**iteration**: <n>

### Résumé
<résultat et solution retenue, en 1 à 3 phrases>

### Fichiers touchés
- `<chemin>` — CRÉÉ | MODIFIÉ | SUPPRIMÉ : <intention>

### Points d'attention
- <hypothèses, limites et déclencheur de révision, éléments non vérifiés et risques>

### Vérifications lancées
- `<check>`: passed | failed | not-run — commande: `<commande réelle>` (cwd: <checkout>) — <preuve ou raison>

### Questions ouvertes
<obligatoire si blocked ; sinon n/a>
```

Renseigner les catégories lint, typecheck, test et build quand elles sont pertinentes ; signaler explicitement celles qui ne s'appliquent pas. Les autres contrôles requis peuvent être ajoutés. Pour une étape UI, ajouter `### Fidélité maquette` avec la référence, les éléments reproduits et les écarts justifiés, ou `n/a`.

## Limites d'autorité

L'implémenteur ne commite pas, ne pousse pas, ne publie pas de PR ou de tag. Il ne modifie ni le statut des plans ni `executions/.etat/` et ne lance pas le tracker. L'orchestrateur gère le suivi et les décisions. Aucune édition dans un dépôt extérieur non déclaré, aucun geste matériel ou accès à une machine externe implicite.
