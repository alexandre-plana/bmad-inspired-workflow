---
type: planning-artifact
kind: task | fix
status: plan            # cycle de vie : plan | ready-to-execute | executing | done
createdAt: "<horodatage ISO-8601 avec décalage>"
source: claude-plan-mode
historyRelation: new | continuation | revision | fix-followup | potential-conflict | supersedes
title: "<Titre clair>"
slug: "<slug-court>"
relatedTaskId: "<id de tâche, ou null>"
relatedFindingId: "<id de finding, ou null>"
relatedIssueId: "<id d'issue, ou null>"
relatedBrief: "<chemin/vers/brief.md, ou null>"
repositoryAreas:
  - "<chemin ou zone>"
tags:
  - "<tag>"
---

# <Titre clair>

<!-- Remplir chaque section. Rester concis ; ne dire chaque chose qu'une fois. Supprimer ce commentaire. -->

## 1. Vérification de l'historique

Indiquer si `index.jsonl` / `INDEX.md` ont été trouvés et consultés, et les
entrées antérieures pertinentes :

| Artefact antérieur | Relation | Pertinence |
|---|---|---|
| `documentation/history/tasks/exemple.md` | continuation | En quoi il est lié. |

Si aucune entrée n'est pertinente, écrire exactement :
`Aucun historique de planification pertinent trouvé.`
En cas de conflit ou de recouvrement, le décrire et nommer le(s) artefact(s).

## 2. Contexte

La demande, la situation actuelle et la zone du dépôt concernée. Ne rien
inventer ; si l'inspection a été partielle, le dire. Signaler toute convention
préexistante applicable.

## 3. Objectif

Le résultat attendu, en termes concrets.

## 4. Périmètre

Ce qui est inclus dans ce plan.

## 5. Hors périmètre

Ce qui ne doit pas être modifié ou traité ici — c'est aussi la liste
« ne pas toucher » pour la personne qui exécutera le plan.

## 6. Plan proposé

Étapes numérotées et précises ; chacune indique quoi, pourquoi, et les fichiers
ou zones affectés quand ils sont connus.

**Chaque étape commence par un tag `[role]`** indiquant le specialist
responsable, pour permettre l'exécution par la skill `execute-plan` (voir
section « Tags de rôle » du skill `plan-history-artifact-writer`). Rôles
canoniques : `backend`, `frontend`, `simulator`, `firmware`, `docs`, `infra`,
`verify`, `decision` ; pour un plan multi-dépôts XPLOR : `station`, `bord`,
`contract` (dépôts frères `xplor-station` et `xplor-contracts`). Tags composés autorisés (`[backend+frontend]`,
`[docs+infra]`) — l'orchestrateur les découpe en sous-étapes séquentielles.

1. **[role]** <Étape — quoi, pourquoi, fichiers attendus>
2. **[role]** <Étape>
3. **[role1+role2]** <Étape transverse, sera découpée à l'exécution>

## 7. Décisions

| Décision | Justification | Alternatives envisagées | Impact |
|---|---|---|---|
|  |  |  |  |

## 8. Modifications attendues du dépôt

La liste des fichiers pour l'exécution :

```
chemin/vers/fichier.ext — CRÉER | MODIFIER | INSPECTER : changement attendu
```

Pour les fichiers inconnus, lister les zones probables marquées `à confirmer`.

## 9. Stratégie de validation

Comment le travail est vérifié : typecheck, tests, lint, build, vérification
manuelle de l'UI, test de fumée à l'exécution, validation des données ou des
sorties — selon ce qui s'applique. Marquer les commandes incertaines
`à confirmer`.

## 10. Critères d'acceptation

- [ ] Le comportement prévu est implémenté et la validation (section 9) passe.
- [ ] Les contraintes de la section 5 ont été respectées ; aucune zone non liée
      n'a été modifiée.
- [ ] L'index d'historique a été mis à jour le cas échéant.
- [ ] <critère spécifique à la tâche>

## 11. Risques et précautions

Risques techniques, ambiguïtés, préoccupations de migration ou de
compatibilité, régressions possibles, conflits avec l'historique.

## 12. Questions ouvertes

Questions non résolues. S'il n'y en a aucune, écrire exactement :
`Aucune question bloquante identifiée.`

## 13. Passation pour exécution

Tout le nécessaire est ci-dessus ; cette section indique seulement comment
l'utiliser.

**Objectif :** <une ou deux phrases — la définition de « terminé ».>

Exécution : lire l'artefact en entier ; inspecter les fichiers de la section 8
avant d'éditer ; réaliser les étapes numérotées de la section 6 ; respecter la
section 5 (ne pas modifier ce qui est hors périmètre) ; valider selon la
section 9 ; le travail est terminé quand les critères de la section 10 sont
remplis.

### Cycle de vie du statut

Le champ `status` de l'en-tête suit l'avancement. Le mettre à jour au fil du
travail :

- `plan` — l'artefact vient d'être rédigé ;
- `ready-to-execute` — le plan est revu et prêt à être exécuté ;
- `executing` — l'implémentation est en cours ;
- `done` — le travail est terminé et validé.
