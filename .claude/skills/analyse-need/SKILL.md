---
name: analyse-need
description: >-
  Conduit une phase d'analyse de besoin **amont** avec l'utilisateur, en une
  seule rafale de questions ciblées (3 à 5), et produit un **brief**
  markdown court sous `documentation/history/briefs/`. Le brief capture
  l'intention, le périmètre pressenti, les contraintes et les alternatives
  écartées — pas la solution, pas les étapes. Il sert ensuite d'entrée à
  `plan-history-artifact-writer` qui en dérive un plan exécutable. À
  déclencher quand l'utilisateur demande explicitement d'**ajouter**,
  d'**introduire**, d'**explorer** une feature, une intégration, un sous-système,
  une norme ou une techno nouvelle — y compris via des formulations
  exploratoires comme « je voudrais qu'on puisse… », « il faudrait un système
  qui… », « je me demande si on pourrait intégrer X ».


  Ne PAS déclencher pour : un **fix** de bug, une **régression**, un
  **refactor** isolé, une **évolution incrémentale** d'une feature déjà
  cadrée, une question informationnelle, une demande d'édition ponctuelle,
  ou tout sujet déjà couvert par un brief `validated` récent (on enchaîne
  alors directement sur `plan-history-artifact-writer`).
---

# Analyse Need — phase d'analyse amont, en une rafale

Cette skill **précède** la planification. Son rôle est de transformer une
intention floue (« j'aimerais qu'on puisse… ») en un **brief** court,
figeable, qui sert d'entrée propre à `plan-history-artifact-writer`.

Elle est **dialogique** : elle vit dans la session principale, pas dans
un subagent. Elle parle à l'utilisateur, écoute ses réponses, et écrit
un fichier — c'est tout.

## Quand déclencher

Formulations qui doivent triggerer la skill :

- « je voudrais **ajouter** un … », « il faudrait **introduire** un … »,
  « on devrait **explorer** une intégration de … » ;
- « il faudrait un système qui … », « je me demande si on pourrait avoir
  un module pour … », « est-ce qu'on pourrait supporter le format X » ;
- toute introduction d'une **norme** (AIS, NMEA, CoT, NVG, MAVLink,
  MISB, DIS/HLA, NITF, …), d'une **techno** (worker pool, queue, GPU
  inference, …), ou d'un **sous-système** (alerting, replay, audit log,
  …) qui n'a pas encore d'existence dans le repo ;
- toute demande de **feature greenfield** dont le périmètre n'est pas
  déjà cerné par un brief `validated` ou un plan en cours.

Formulations qui doivent **skipper** la skill :

- « le bouton ne marche pas », « la carte freeze quand … », « il y a une
  régression sur … » → c'est un fix, va directement vers
  `plan-history-artifact-writer` (kind `fix`).
- « refactor le service X pour … » → la cible est connue, le besoin est
  déjà cadré, va directement vers `plan-history-artifact-writer`.
- « ajoute le champ `confidence` aux observations » → évolution
  incrémentale d'un type existant, pas de brief nécessaire.
- « comment fonctionne `openLiveOrReplaySocket` ? » → question informationnelle,
  réponds directement.
- l'utilisateur dispose déjà d'un brief `validated` couvrant le sujet
  → passe au writer avec `relatedBrief:` pointant dessus.

En cas de doute sur un sujet borderline, **demander à l'utilisateur** :
« On dirait une nouvelle feature greenfield. Tu veux qu'on passe par un
brief court d'abord, ou tu préfères qu'on attaque le plan directement ? »

## Procédure — 5 étapes

### Étape 1 — Consultation de l'historique

Ouvrir `documentation/history/index.jsonl` et chercher (par mots-clés du
besoin, repository area, tags probables) si un plan ou un brief
antérieur a déjà touché au sujet. Tu vises **deux** choses :

- détecter un brief `validated` existant qui rendrait la skill inutile
  (on enchaîne alors directement sur `plan-history-artifact-writer`) ;
- détecter un plan antérieur (`tasks/` ou `fixes/`) qui contraint le
  cadrage du nouveau besoin — à mentionner dans le brief final.

Lister aussi `documentation/history/briefs/` (les briefs ne sont pas
indexés dans `index.jsonl`, cf. README du dossier) : un `ls` du dossier
suffit, les noms de fichiers portent slug et date.

Si rien ne ressort, c'est explicitement noté dans le brief
(« aucun brief ni plan antérieur lié »).

### Étape 2 — Inspection superficielle de la zone concernée

Lecture **rapide** (pas de grep exhaustif, pas de lecture complète de
fichier > 200 lignes) de la zone du repo concernée par le besoin
pressenti :

- structure du dossier cible (`ls`),
- nom des principaux modules / composants déjà présents,
- éventuelle dépendance externe déjà installée qui couvre tout ou
  partie du besoin.

Objectif : **cadrer** la rafale de questions, pas construire la
solution. Si tu te surprends à lire en détail le code d'un module pour
comprendre comment il marche, tu vas trop loin — c'est le rôle du
writer de plan, pas du brief.

### Étape 3 — Une seule rafale de questions (3 à 5)

Émettre **une unique** invocation `AskUserQuestion` avec **3 à 5**
questions ciblées. Les questions couvrent typiquement :

1. **Intention / cas d'usage** : qui s'en sert, pour faire quoi, dans
   quel scénario opérationnel ?
2. **Périmètre minimal** : qu'est-ce qui doit absolument marcher en
   v1 ? Qu'est-ce qui est explicitement hors scope v1 ?
3. **Contraintes** : compatibilité (normes existantes, autres
   sous-systèmes), perf, sécurité, déploiement.
4. **Alternatives envisagées** : a-t-on déjà écarté une approche ?
   Pourquoi ?
5. **Critère de succès** : à quoi reconnaît-on que le besoin est
   couvert ?

Les questions doivent être **fermées ou semi-ouvertes** (à choix
multiples ou réponse courte attendue), pas des dissertations. C'est le
sens de la limite à une rafale : si tu sens qu'il en faudrait une
deuxième, c'est que le sujet n'est pas mûr (cf. § Limite).

### Étape 4 — Synthèse en brief markdown

Rédiger le brief sous :

```
documentation/history/briefs/YYYY-MM-DD_HH-mm_brief_<slug>.md
```

(cf. convention de nommage dans
[`../../../documentation/history/briefs/README.md`](../../../documentation/history/briefs/README.md))

Le brief suit le template
[`assets/brief-template.md`](assets/brief-template.md) et reste **court** :
viser ~2 KB, ne pas dépasser ~4 KB. Le brief n'est pas un plan : il ne
liste pas d'étapes, pas de fichiers à modifier, pas d'architecture
cible.

Statut initial : `draft`. Le passage à `validated` se fait quand
l'utilisateur a explicitement validé le contenu — ne pas y aller
unilatéralement.

### Étape 5 — Audit conditionnel puis enchaînement vers le writer

Le dialogue et le brief restent l'entrée du nouveau besoin. Une inspection
superficielle ne se transforme pas en audit approfondi pendant cette skill.
Si l'utilisateur demande un audit, ou si une limite du code existant peut
compromettre le besoin, utiliser ensuite
[`ponytail-tools`](../ponytail-tools/SKILL.md), qui charge l'audit officiel
sur le checkout et le périmètre concernés. Sinon, aller directement au writer.
Un brief validé et toujours pertinent reste réutilisable sans nouvelle rafale.

Les constats enrichissent le contexte du plan ; ils ne remplacent pas le
brief et n'élargissent pas automatiquement le périmètre. Si l'audit invalide
un objectif, une contrainte critique ou le périmètre, revenir au dialogue et
faire valider le cadrage révisé avant l'exécution. Conserver le rapport d'audit
séparé du brief, court, et ne pas y recopier tous ses constats.

Une fois le brief écrit (statut `draft` ou `validated` selon l'accord
utilisateur), **proposer** à l'utilisateur :

> Le brief est prêt sous `<chemin>`. Tu veux que j'enchaîne avec
> `plan-history-artifact-writer` pour en dériver un plan exécutable ?
> Le writer prendra le brief en entrée via le champ `relatedBrief:` du
> plan généré.

Si l'utilisateur accepte, l'enchaînement se fait dans la même session.
Si l'utilisateur refuse ou veut laisser reposer, ne rien forcer : le
brief reste sur disque, le couplage `brief → plan` se fait plus tard.

## Output

Un unique fichier :

```
documentation/history/briefs/YYYY-MM-DD_HH-mm_brief_<slug>.md
```

avec frontmatter et corps conformes à
[`assets/brief-template.md`](assets/brief-template.md).

Pas d'index à mettre à jour : les briefs ne sont **pas** indexés dans
`documentation/history/INDEX.md` ni dans `documentation/history/index.jsonl`
(cf.
[README briefs](../../../documentation/history/briefs/README.md#pas-dindex-dans-cette-version)).
Le rattachement se fait via le champ `relatedBrief:` du plan dérivé,
rempli plus tard par `plan-history-artifact-writer`.

## Limite — une seule rafale, sinon abandon

**Règle dure** : la skill émet **une et une seule** rafale
`AskUserQuestion`. Si à la lecture des réponses, tu constates que :

- des questions de fond restent ouvertes (intention floue, périmètre
  contradictoire, contraintes incompatibles) ;
- la rédaction du brief exigerait une deuxième rafale pour lever
  l'ambiguïté ;
- l'utilisateur lui-même formule ses réponses comme « ça dépend » /
  « je ne sais pas encore »…

…alors **abandonner proprement** le brief. Ne pas écrire un brief
incomplet ou conjectural sur disque (un brief publié engage : il sera
référencé par des plans).

Signaler à l'utilisateur, par exemple :

> Le sujet n'est pas encore assez mûr pour un brief figeable (plusieurs
> zones de flou demanderaient une seconde rafale de questions, ce que
> cette skill ne fait pas). Je te propose à la place une exploration en
> mode question/réponse directe, sans artefact à la clé, jusqu'à ce
> qu'on ait un cadrage assez net pour relancer `analyse-need` en une
> rafale.

L'utilisateur décide alors entre : (a) explorer en libre dialogue
jusqu'à clarification, (b) abandonner le besoin, ou (c) sauter le brief
et attaquer directement un plan (au risque que le writer bute sur les
mêmes ambiguïtés).

## Articulation avec les autres skills

- **`plan-history-artifact-writer`** — consommateur direct du brief
  produit. Le writer prend le brief en entrée et le référence via le
  champ `relatedBrief:` du frontmatter du plan généré. Le writer met
  également à jour le champ `relatedPlans:` du brief (cf. README
  briefs).
- **`execute-plan`** — pas de lien direct, mais informé du brief
  indirectement : un plan en cours d'exécution qui porte `relatedBrief:`
  permet à l'orchestrateur (et aux subagents) de remonter au besoin
  initial en cas d'ambiguïté pendant l'exécution.
- **`shard-plan`** — pas de lien direct ; le sharding est une opération
  post-plan, sans interaction avec les briefs.
- **Règles du projet cible** — si le brief introduit un nouveau modèle ou
  un contrat, identifier les contraintes réellement documentées dans le
  projet et les références existantes à transmettre au writer puis aux
  implémenteurs. Ne pas imposer une norme ou une skill absente.
