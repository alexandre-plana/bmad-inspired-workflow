---
name: shard-plan
description: >-
  Découpe un artefact de plan monolithique
  (`documentation/history/tasks/<slug>.md` ou `.../fixes/<slug>.md`) en une
  arborescence de fichiers sous `<slug>/` (un `index.md` + un fichier par
  section de niveau 2, avec sub-sharding systématique de la section « Plan
  proposé » en `06-plan-propose/<NN>-<slug-étape>.md`). Sait aussi recoller
  une arborescence sharded en un mono via le mode `--undo`, de façon
  réversible à l'octet près. À déclencher quand l'utilisateur demande
  explicitement de sharder un plan, de le découper en sections, ou de le
  re-fusionner ; et quand un plan dépasse 30 étapes ou est étiqueté comme
  un épic dans son frontmatter.


  Ne PAS déclencher pour modifier le contenu sémantique d'un plan (édition
  de sections, ajout d'étapes — c'est du ressort de l'utilisateur ou de
  `plan-history-artifact-writer`), pour migrer rétroactivement les plans
  courants déjà classés (le sharding est opt-in par plan, jamais
  automatique), ni pour les artefacts de fix (`documentation/history/fixes/`)
  qui restent toujours mono-fichier.
---

# Shard Plan — découpage et recollage d'artefacts de plan

Cette skill transforme un plan monolithique en arborescence navigable, et
inversement. Elle ne touche **jamais** au contenu sémantique des sections :
le sharding est une projection mécanique, réversible, qui préserve chaque
caractère du mono.

L'exécution de l'algorithme est faite par Claude (l'agent qui invoque la
skill) au moment de l'invocation — il n'y a **pas** de script `.mjs` ni
`.ps1` à appeler. La skill décrit l'algorithme ; l'agent l'applique avec ses
outils standards (`Read`, `Write`, `Edit`).

## Quand utiliser

- L'utilisateur demande explicitement « sharder », « découper », « éclater »
  un plan, ou « refusionner », « recoller », « unshard » une arborescence.
- Un plan dépasse 30 étapes dans sa section 6, ou son frontmatter porte un
  type `epic` / `epique`.
- L'utilisateur veut éditer une section d'un plan trop gros sans avoir à
  charger l'intégralité du mono en contexte.

## Quand ne pas utiliser

- Modification sémantique d'un plan (ajout d'étape, réécriture d'objectif) :
  édition directe par l'utilisateur ou via `plan-history-artifact-writer`.
- Migration en masse de plans existants : le sharding est opt-in par plan.
- Artefacts de fix (`documentation/history/fixes/`) : toujours mono-fichier.
- Construction du `documentation/history/INDEX.md` global : géré par
  `plan-history-artifact-writer`.

## Modes d'invocation

```
shard-plan <chemin-vers-mono>.md
shard-plan --undo <chemin-vers-dossier>/
```

Dans les deux cas, la skill **demande confirmation à l'utilisateur** avant
toute suppression (du mono après sharding, ou du dossier après recollage).

---

## Algorithme — mode shard (mono → arbo)

### Étape 1 — pré-vérifications (garde-fous)

Refuser et signaler l'erreur si :

- Le fichier source n'existe pas ou n'est pas un `.md`.
- Le dossier cible `<chemin-sans-.md>/` existe déjà et n'est pas vide.
- Le frontmatter du mono ne contient pas **les trois champs minimum
  d'identité** : `title`, `slug`, `status`. (Le frontmatter est le bloc
  YAML entre deux lignes `---` en tête de fichier.)

### Étape 2 — parsing des sections de niveau 2

Détection par regex sur le contenu **hors frontmatter** :

```
^## (\d+)\. (.+)$
```

Chaque match ouvre une nouvelle section ; le contenu de la section s'étend
jusqu'au match suivant ou jusqu'à la fin du fichier. Le **préambule** (tout
ce qui précède le premier `## `) inclut le frontmatter et toute introduction
libre éventuelle.

### Étape 3 — composition de `index.md`

`<dir>/index.md` contient :

1. Le frontmatter du mono (recopie à l'identique).
2. Le préambule entre la fin du frontmatter et le premier `## ` (souvent
   vide ou un H1).
3. Les sections **1, 2 et 3 inline** (généralement « Vérification de
   l'historique », « Contexte », « Objectif » — courtes et toujours
   consultées ensemble).
4. Une **table des matières** listant les sections restantes avec un lien
   relatif vers chaque fichier de section (et vers
   `06-plan-propose/index.md` pour la section 6).

Format de la table des matières :

```markdown
<!-- shard-plan:toc-start -->
## Sommaire

- [4. Périmètre](04-perimetre.md)
- [5. Hors périmètre](05-hors-perimetre.md)
- [6. Plan proposé](06-plan-propose/index.md)
- [7. ...](07-....md)
...
<!-- shard-plan:toc-end -->
```

**Convention de bornes** : la table des matières est encadrée par deux
commentaires HTML invisibles `<!-- shard-plan:toc-start -->` et
`<!-- shard-plan:toc-end -->`. Ces marqueurs structurels servent à l'unshard
pour identifier et élaguer la TOC sans dépendre du texte du titre. Le titre
`## Sommaire` lui-même est libre : l'utilisateur peut le renommer ou le
supprimer sans casser la réversibilité, tant que les deux bornes restent
en place autour du bloc à élaguer.

### Étape 4 — naming des fichiers de section

Format : `<NN>-<slug>.md` où :

- `NN` = numéro de section sur **2 chiffres** (`04`, `05`, …, `12`).
- `slug` = titre normalisé :
  1. Lowercase.
  2. Normalisation Unicode NFD + suppression des diacritiques (donc
     « Périmètre » → `perimetre`, « Stratégie » → `strategie`).
  3. Apostrophes et ponctuation supprimées (`L'objectif` → `lobjectif`).
  4. Espaces et caractères non alphanumériques restants → tirets simples.
  5. Tirets multiples consécutifs réduits à un seul, pas de tiret en
     début/fin.
  6. Troncature à **50 caractères** (en coupant proprement à un tiret si
     possible).

Exemples :

| Titre | Slug |
|---|---|
| `4. Périmètre` | `04-perimetre.md` |
| `5. Hors périmètre` | `05-hors-perimetre.md` |
| `8. Modifications attendues du dépôt` | `08-modifications-attendues-du-depot.md` |
| `12. Questions ouvertes` | `12-questions-ouvertes.md` |

### Étape 5 — sub-sharding **systématique** de la section 6

La section 6 (« Plan proposé ») est **toujours** sub-shardée, sans seuil.
Création du sous-dossier `<dir>/06-plan-propose/`.

#### 5a — `06-plan-propose/index.md`

Table des étapes au format :

```markdown
## Plan proposé — index des étapes

| N° | Tag | Titre court | Lien |
|---|---|---|---|
| 1 | `[backend]` | Définir l'algorithme de sharding | [01-...](01-...md) |
| 2 | `[backend]` | Créer le fichier SKILL.md | [02-...](02-...md) |
...
```

- **Tag** : extrait du bullet d'étape (motif `\[([a-z+]+)\]`).
- **Titre court** : première phrase du bullet, jusqu'au premier `.` ou
  retour ligne, troncature 80 chars.

#### 5b — `06-plan-propose/<NN>-<slug-étape>.md`

Un fichier par étape, contenant :

```markdown
## Étape <N> — [tag] <titre>

<bullet complet : texte, sous-bullets, fichiers attendus, etc.>
```

Le slug d'étape suit la même règle que le slug de section (§ Étape 4).

### Étape 6 — confirmation et suppression du mono

Après écriture complète de l'arborescence, **demander à l'utilisateur** :

> Arborescence créée sous `<dir>/`. Supprimer le mono `<chemin>.md` ?

Ne jamais supprimer sans accord explicite.

**Workflow conseillé** : supprimer le mono après le shard (réponse `oui` à
la confirmation). Si tu refuses la suppression, le mono cohabite avec
l'arborescence sharded ; tu peux toujours éditer le sharded librement, mais
`shard-plan --undo` sera refusé tant que le mono existe (pour éviter
d'écraser des modifications divergentes). Dans ce cas, supprime le mono
manuellement avant d'invoquer `--undo`, ou continue à travailler en mono
uniquement.

### Étape 7 — proposition de mise à jour de INDEX.md

Proposer (sans exécuter sans accord) à l'utilisateur la mise à jour du lien
dans `documentation/history/INDEX.md` : remplacer `<slug>.md` par
`<slug>/index.md`. C'est à l'utilisateur de valider la modification.

---

## Algorithme — mode `--undo` (arbo → mono)

### Étape 1 — pré-vérifications

Refuser si :

- Le dossier source n'existe pas, n'est pas un dossier, ou ne contient pas
  d'`index.md`.
- Le mono cible `<chemin-parent>/<slug>.md` existe déjà (le slug est lu
  dans le frontmatter de `index.md`). Conflit dual file interdit.

### Étape 2 — lecture ordonnée des fichiers

1. Lire `<dir>/index.md` : frontmatter + sections inline 1-3.
2. Lister tous les `<dir>/NN-*.md` (hors `index.md`), trier numériquement
   par préfixe `NN`.
3. Si `<dir>/06-plan-propose/` existe :
   - Lister tous les `06-plan-propose/NN-*.md` (hors `index.md`), trier
     numériquement.

### Étape 3 — reconstruction du mono

Concaténer dans l'ordre :

1. Frontmatter de `index.md`.
2. Préambule + sections 1-3 inline de `index.md` (sans la table des
   matières — la skill l'identifie par les bornes
   `<!-- shard-plan:toc-start -->` et `<!-- shard-plan:toc-end -->` et
   élague tout ce qui est compris entre ces deux marqueurs, bornes
   incluses). Le titre `## Sommaire` n'a aucun rôle d'identification : il
   est élagué uniquement s'il se trouve à l'intérieur des bornes.
3. Pour chaque fichier `NN-*.md` (hors section 6) : le contenu intégral, en
   préservant le titre `## N. Titre`.
4. Pour la section 6 : reconstituer `## 6. Plan proposé` suivi de la
   concaténation des bullets de chaque étape (en retirant les titres H2
   d'étape `## Étape N — ...` qui ne servaient que de wrapper de fichier).

### Étape 4 — écriture et confirmation

Écrire `<chemin-parent>/<slug>.md`. Demander confirmation utilisateur avant
de supprimer le dossier `<dir>/`.

---

## Garde-fous transverses

- **Réversibilité sémantique + EOL normalisée LF** : la skill **normalise
  systématiquement à LF** en sortie de shard et de `--undo` (tous les
  fichiers écrits utilisent `\n` comme terminateur de ligne, jamais
  `\r\n`). Aucun caractère du contenu sémantique n'est modifié ; seule la
  fin de ligne est uniformisée. Conséquences :
  - Sur macOS/Linux (LF natif), l'égalité **octet-à-octet** entre le mono
    d'origine et le mono reconstruit par `shard X.md → shard --undo X/`
    tient.
  - Sur Windows, si le mono d'origine était en CRLF, le mono reconstruit
    sera en LF : le hash diffère, mais le contenu sémantique est
    strictement préservé. La garantie effective est « réversibilité
    sémantique + EOL normalisée LF », pas « égalité octet-à-octet
    inconditionnelle ».
  - Cette normalisation est volontaire : elle aligne les artefacts
    sharded sur la convention LF déjà appliquée par le reste du
    monorepo (`.gitattributes`, sortie des générateurs).
- **Pas de modification sémantique** : ne pas reformuler, ne pas corriger
  de fautes, ne pas réordonner les sections, ne pas renuméroter.
- **Pas de cache** : chaque invocation relit les fichiers source. Pas
  d'incrémental.
- **Pas de dépendance npm** : parsing markdown par regex simple, exécuté
  par l'agent via ses outils standards.

---

## Articulation avec le reste de l'écosystème

### Avec `execute-plan`

L'orchestrateur `execute-plan` implémente la **dual discovery** : tente de
résoudre le plan en mono d'abord, puis en sharded (`<slug>/index.md`). Le
mono prime si les deux existent (mais cf. garde-fou `--undo` ci-dessus :
shard et mono ne doivent jamais coexister).

Le sharding est **opt-in par plan**, jamais automatique. Aucun déclenchement
implicite par `execute-plan` ou par un autre subagent.

### Avec `plan-history-artifact-writer`

`plan-history-artifact-writer` produit toujours un mono. Le sharding est
une opération **post-création**, déclenchée à la demande quand le plan
devient trop volumineux pour être navigable.

### Avec `documentation/history/INDEX.md`

Quand un plan est sharded, son lien dans `INDEX.md` doit pointer vers
`<slug>/index.md`. La skill **propose** cette modification à l'utilisateur
au moment du shard (étape 7) mais ne l'effectue jamais sans validation
explicite.
