---
name: plan-history-artifact-writer
description: >-
  Use this skill when the user wants an approach worked out and recorded
  before any building or fixing begins: planning a task, designing a feature
  or component, devising a bug-fix or regression strategy, or analyzing a
  problem before files are edited. Also use it whenever Claude Code enters
  planning mode for repository work spanning multiple files, architecture,
  data models, UI behavior, prompts, scripts, tests, or docs. It writes the
  plan as a durable Markdown artifact under documentation/history/ and updates
  a planning index. Trigger even when the user never says "plan" but clearly
  wants a strategy before changes are made.


  Do NOT trigger when the user is only asking a question and expects an answer
  rather than upcoming work — including questions about how the code works, or
  about the meaning of a field, term, status, or section in an existing
  planning artifact or index. Answer those directly. Also skip trivial
  one-line edits, and cases where the user declines a planning artifact.
---

# Plan History Artifact Writer

Before implementation or fix work begins, write the plan to disk as a durable
Markdown **artifact** under `documentation/history/`, and keep the planning
index current. Each artifact is both a permanent record of what was planned and
an executable plan a future agent can run without ever seeing this conversation.

## What this skill produces

- One artifact per planning step, in `documentation/history/tasks/` (features,
  refactors, design, docs) or `documentation/history/fixes/` (bug fixes,
  regressions, corrective work).
- One appended line in `documentation/history/index.jsonl` — the
  machine-readable source of truth.
- One new row in `documentation/history/INDEX.md` — a human-readable projection
  of the JSONL index.

```
documentation/history/
  index.jsonl   INDEX.md   tasks/   fixes/
```

Create any folder or index file that does not exist yet. All paths are relative
to the repository root.

## When to run, and when not to

Run when the user wants planning before implementation: a task plan, a fix
strategy, a feature or component design, an analysis before editing files, or
when Claude Code enters planning mode for work spanning multiple files. Run it
even when the user does not say "plan" but clearly wants a strategy first.

Skip it for trivial one-line edits, purely informational questions, or when the
user says they do not want a planning artifact. When unsure and the work is
non-trivial, write the artifact — a slightly unnecessary plan is cheap; a lost
one is not.

The artifact must be on disk **before** any code is modified. Once it and the
indexes are written, continue to implementation only if the user asked for it.

## Working efficiently

This skill runs often, so it must stay cheap — without weakening the artifact.

- **Index first.** `index.jsonl` exists so you can judge history without
  opening every artifact. Read or search it; open a full artifact only when a
  line looks genuinely related (Step 1).
- **Append, don't rewrite.** Add one line to `index.jsonl`; insert one row in
  `INDEX.md`. Never rewrite either file wholesale (only exception: repairing
  JSON that fails to parse).
- **Inspect narrowly.** Read the specific source files the task touches. Do not
  grep or `git log` the whole repository. When a file's contents are unknown,
  mark it `to confirm` rather than hunting it down.
- **Write tight.** Fill every artifact section, but say each thing once.

## The workflow

Six steps, in order. The artifact must be on disk before any code changes.

### Step 1 — Consult the planning history (index first)

Understand prior planning without opening every artifact.

1. Open `documentation/history/index.jsonl`. If it is short (roughly under 50
   lines), read it whole. If it is long, do **not** read all of it — search it
   for terms from the request (repository area, feature or component name,
   likely tags) and pull only matching lines into context. The index grows with
   every plan; searching keeps this step cheap in a mature repository.
2. Judge each line's relevance from the line alone — `title`, `description`,
   `tags`, `repositoryAreas`, the related ids. Skip the plainly unrelated.
3. Open a full artifact `.md` **only** when a line looks genuinely related: the
   same repository area, a possible continuation, a possible conflict, or a
   plan this one supersedes. A few candidate reads are normal; reading all of
   them is waste.
4. If `index.jsonl` is absent, scan filenames in `tasks/` and `fixes/` and read
   only their titles (the `# ` heading or the `title:` line) — not full bodies.
   Open a body only for a filename that looks related. A real repository often
   has artifacts but no index yet.
5. If neither an index nor an artifact folder exists, the history is empty.

Record what you found in section 1 of the artifact: reference relevant prior
entries explicitly, or state explicitly that none were found.

### Step 2 — Classify

**Kind** — `task` or `fix`; see [Classification](#classification).
**History relation** — `new`, `continuation`, `revision`, `fix-followup`,
`potential-conflict`, or `supersedes`; see [History relation](#history-relation).

Never silently duplicate a plan for a subject already covered: pick the relation
that states the truth and name the prior artifact. If the new plan could
contradict prior work, use `potential-conflict` and give a safe resolution
strategy in the artifact.

### Step 3 — Write the artifact

**Capture the current local date and time once**, then reuse that single
timestamp everywhere it is needed — the filename prefix, the artifact's
`createdAt`, and the `date` field in the index — so all three agree. Get it
with `date "+%Y-%m-%dT%H:%M:%S%z"`, or in PowerShell
`Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"`.

Filename — exactly this format:

```
YYYY-MM-DD_HH-mm_<kind>_<short-slug>.md
```

The leading `YYYY-MM-DD_HH-mm` is deliberate: it makes a plain alphabetical
sort of the folder a reliable chronological sort, with no metadata parsing.
`<kind>` is `task` or `fix`; `<short-slug>` is concise, lowercase, hyphenated,
derived from the request — include a task/issue/finding id if one is known.
Never overwrite an existing artifact; if a near-identical one exists, create a
new dated file and reference the old one.

Copy [`assets/artifact-template.md`](assets/artifact-template.md) and fill
**every** section. **Write the artifact body in French** — the repository's
working language; keep the frontmatter field keys and the enum values
(`kind`, `historyRelation`, `status`) unchanged. Set `status` to `plan` — the
start of the lifecycle `plan → ready-to-execute → executing → done`; the later
states are set as the plan is reviewed and carried out, not by this skill. Save
to `tasks/` or `fixes/` by kind, and meet the [Quality bar](#quality-bar).

### Step 4 — Append to index.jsonl

Append **one** line — a single valid JSON object — to
`documentation/history/index.jsonl`. Fields:

- `date` — the single Step 3 timestamp, ISO-8601 with offset, e.g.
  `"2026-05-21T10:35:00+02:00"`
- `kind` — `"task"` or `"fix"`
- `artifact` — path relative to `documentation/history/`, e.g.
  `"tasks/2026-05-21_10-35_task_file-index-graph.md"`
- `title` · `description` (one sentence) · `historyRelation`
- `relatedTaskId` · `relatedFindingId` · `relatedIssueId` — id string or `null`
- `repositoryAreas` — array · `tags` — array

Preserve every existing line; append only; never rewrite the file (only
exception: repairing invalid JSON); never add a second entry for one artifact.
A superseded entry is never deleted — the new artifact carries
`historyRelation: supersedes` and names the superseded artifact. If
`index.jsonl` is absent, create it with this single line.

Example line:

```json
{"date":"2026-05-21T10:35:00+02:00","kind":"task","artifact":"tasks/2026-05-21_10-35_task_file-index-graph.md","title":"Graphe d'index de fichiers","description":"Planifie une vue en graphe du contexte indexé du dépôt.","historyRelation":"continuation","relatedTaskId":"TASK-14-03","relatedFindingId":null,"relatedIssueId":null,"repositoryAreas":["src/features/file-index"],"tags":["file-index","ui"]}
```

### Step 5 — Update INDEX.md

`INDEX.md` is a human-readable projection of `index.jsonl` — one row per JSONL
line. Create it from [`assets/INDEX-template.md`](assets/INDEX-template.md) if
absent. Insert one row in the `Entries` table with a targeted edit — do not
regenerate the table; preserve existing rows. Rows are ordered by the `date`
field, newest first; a new plan is the most recent, so its row goes at the top.
If updating `INDEX.md` fails, say so in the report.

Example row:

```md
| 2026-05-21 10:35 | task | [file-index-graph](./tasks/2026-05-21_10-35_task_file-index-graph.md) | Graphe d'index de fichiers | Planifie une vue en graphe du contexte indexé. | continuation | TASK-14-03 | `src/features/file-index` |
```

### Step 6 — Report

Give the [final report](#final-report). Do not paste the full artifact unless
asked — it lives on disk.

## Classification

**`fix`** — correcting something wrong: a bug, a regression, a failing test or
verification, broken behavior, an error message, a corrective patch. Goes in
`documentation/history/fixes/`.

**`task`** — building or changing something: a feature, an improvement to a
flow, a refactor, a component design, documentation, a technical plan,
infrastructure or tooling. Goes in `documentation/history/tasks/`.

If genuinely unsure, choose `task` and note the uncertainty in the artifact's
Context section. Do not create both a task and a fix artifact for one planning
step unless the user explicitly asks.

## History relation

| Value | Use when |
|---|---|
| `new` | No related prior planning artifact was found. |
| `continuation` | This plan extends or builds on prior work. |
| `revision` | This plan changes the direction of a previous plan. |
| `fix-followup` | This plan addresses a bug/regression after prior work. |
| `potential-conflict` | This plan may contradict or overlap with prior work. |
| `supersedes` | This plan intentionally replaces an older plan. |

For `potential-conflict` or `supersedes`, name the prior artifact(s) in
section 1 and explain how the conflict is resolved or why the replacement is
intentional.

## Quality bar

A future agent must be able to execute the artifact with no access to this
conversation. So it must be:

- **self-contained** — copy needed context in; never write "as discussed above"
  or "use the approach from the conversation";
- **repository-oriented** — name concrete file paths whenever known;
- **precise** — each step says what to do and why;
- **explicit** about assumptions, constraints, non-goals, expected file changes,
  what must not change, and how to validate.

Write executable instructions, not vague ones — not `Improve the feature and
update the files`, but `Update src/history/index.ts to append a JSONL entry
after each artifact is created; preserve existing entries; add a check that the
last line has the required fields`.

Say each thing once: the template's sections build on each other — do not
restate the objective, the steps, the file list, or the validation across
sections. When files or commands are unknown, list probable areas marked
`to confirm` rather than inventing specifics. Carry concise rationale and
tradeoffs, not hidden reasoning.

## Final report

Report briefly: the artifact path; whether it is `task` or `fix`; the updated
`index.jsonl` and `INDEX.md` paths; the history relation and any prior artifact
it relates to; a one-paragraph plan summary; any blocking open questions. Keep
it short.

## Brief en entrée

Un plan peut être généré à partir d'un **brief d'analyse** produit en amont par
la skill [`analyse-need`](../analyse-need/SKILL.md). Le brief vit sous
`documentation/history/briefs/` ; voir
[`documentation/history/briefs/README.md`](../../../documentation/history/briefs/README.md)
pour la convention de nommage et le format du frontmatter.

Quand le brief est l'entrée du plan, le frontmatter du plan porte un champ
optionnel `relatedBrief:` dont la valeur est le chemin du brief **relatif à
`documentation/history/`**, par exemple :

```yaml
relatedBrief: "briefs/2026-05-27_10-12_brief_sharding-strategy.md"
```

Workflow lorsque l'utilisateur fournit un brief (par chemin) :

1. **Lire le brief** intégralement avant d'écrire le plan.
2. **Résumer le brief en 2-3 lignes** dans la section 2 (« Contexte ») du
   plan — un condensé, pas une duplication. Le lecteur du plan ne doit pas
   avoir à ouvrir le brief pour comprendre l'origine du besoin.
3. **Citer la recommandation du brief** comme justification d'objectif dans la
   section 3 (« Objectif »). Mentionner explicitement que la recommandation
   vient du brief (ex. « Conformément à la recommandation du brief … »).
4. **Renseigner `relatedBrief:`** dans le frontmatter du plan avec le chemin
   relatif décrit ci-dessus.

**Effet de bord append-only sur le brief** — une fois le plan écrit sur disque,
ouvrir le frontmatter du brief et **ajouter** le slug du nouveau plan dans le
tableau `relatedPlans:`. Édition append-only : ne jamais retirer ni réordonner
les entrées existantes. Exemple :

```yaml
relatedPlans:
  - "tasks/2026-05-21_10-35_task_file-index-graph.md"
  - "tasks/2026-05-27_10-40_task_plan-sharding-and-analyse-need-skill.md"  # ajouté
```

**Garde `status: draft`** — si le brief porte `status: draft` dans son
frontmatter, l'analyse n'a pas été validée par l'utilisateur. Le plan peut
quand même être généré, mais **prévenir explicitement l'utilisateur** dans le
rapport final que le plan a été produit à partir d'une analyse non validée, et
recommander de relire le brief avant d'exécuter le plan.

## Audit technique en entrée

Après le cadrage du besoin, un audit conditionnel peut être fourni par
[`ponytail-tools`](../ponytail-tools/SKILL.md), via le skill Ponytail original.
S'il n'est pas nécessaire, conserver le parcours direct brief → plan ; ne pas
lancer un audit global pour tout fix ou toute évolution.

Lire le rapport, son checkout, sa couverture, sa charge supposée et ses limites.
Le référencer dans le contexte du plan (chemin s'il a été autorisé à persister,
sinon constats utiles numérotés et limites), sans prétendre avoir audité les
zones non lues. Relier les étapes retenues au besoin et à ses critères.
Les recommandations hors périmètre restent des suites possibles, jamais des
étapes ajoutées automatiquement. Un `Must fix` hors scope est signalé avec sa
conséquence et soumis à arbitrage ; sa gravité n'étend pas l'autorisation.

Si le rapport contredit un objectif, une contrainte critique ou le périmètre
du brief, revenir à `analyse-need` pour arbitrer et réviser le cadrage avant de
publier un plan exécutable. Un brief `draft` ou `obsolete` n'est pas déclaré
validé par la production du plan ou par un verdict d'audit.

## Composition d'écran en entrée

Quand un plan porte une étape `[frontend]` qui **compose ou refond
structurellement** un écran, un panneau, un drawer, un dialog ou une modale, la
structure fonctionnelle se fixe **en amont** avec le skill
[`screen-composition`](../screen-composition/SKILL.md), puis se matérialise
selon les règles UI et le système de design du projet cible, s'ils existent. Flux habituel : brief → **composition** → **maquette**
(produite par l'utilisateur) → plan enrichi par la maquette. Sur une maquette
déjà contractuelle, la composition n'arrive qu'après : elle explicite la
logique de la maquette et couvre ses zones non spécifiées, sans la redessiner.

- Le livrable de composition vit **à côté de la maquette** :
  `documentation/mockups/<slug>/composition-<écran>.md` (contrat de sortie
  complet, clés `PRIMARY TASK` → `GAPS TO ARBITRATE`).
- L'étape du plan **référence** ce fichier comme elle référence la maquette ;
  ses `GAPS TO ARBITRATE` non tranchés deviennent des étapes **`[decision]`**
  placées **avant** l'implémentation, jamais des « points d'attention » laissés
  à l'implementer.
- Sans maquette ni composition sur un sujet visuel, **demander** à
  l'utilisateur s'il en a une avant de figer l'étape : les maquettes vivent
  souvent hors du repo (artifacts), et un « n/a maquette » est rarement vrai.

## Role tags (section 6)

Each bullet in section 6 (« Plan proposé ») of an artifact **must** start with a
role tag like `[backend]` or `[frontend]`, written in bold in the markdown
source (`**[role]**`). This makes the plan executable by the `execute-plan`
skill, which routes each step to the matching specialist subagent.

Canonical roles:

| Tag | Specialist | Scope |
|---|---|---|
| `[backend]`, `[simulator]`, `[docs]`, `[infra]` | `backend-implementer` | Checkout et chemins explicitement autorisés pour l'étape |
| `[frontend]` | `frontend-implementer` | Interface et système de design du projet cible |
| `[station]`, `[contract]`, `[bord]` logiciel | `station-implementer` | Intégration ou contrat dans un checkout déclaré |
| `[firmware]`, `[bord]` matériel | aucun — manuel | Cible et accès précisés par le plan |
| `[verify]` | `verifier` | Vérification indépendante explicite |
| `[decision]` | aucun | Décision utilisateur |

**Plans multi-dépôts** : le tag choisit un rôle, le plan choisit le dépôt.
Chaque étape déclare sa cible, son périmètre autorisé et les commandes de
validation propres à ce checkout. Aucun nom de dépôt ni chemin machine n'est
implicite. Le plan reste dans son dépôt de planification. Les règles métier,
langues, stacks et skills nécessaires proviennent du projet cible ; ne pas
référencer une skill absente comme dépendance obligatoire.

Composite tags (`[backend+frontend]`) are allowed for genuinely transverse work;
the orchestrator splits them into sequential mono-role sub-steps at execution
time. Sub-steps inherit the tag of their parent unless explicitly overridden.

### Niveau de complexité (profil `auto` d'`execute-plan`)

Chaque étape confiée à un implementer porte, juste après son tag de rôle, un
**niveau de complexité** en italique : `**[frontend]** _(simple)_`,
`**[backend]** _(standard)_`, `**[docs]** _(simple)_`,
`**[backend+frontend]** _(complexe)_`. Sous le profil `auto` (défaut
d'`execute-plan`), ce niveau choisit le modèle de l'étape : `simple` → Sonnet
5.5 @ medium, `standard` → Opus 5.5 @ medium, `complexe` → Opus 5.5 @ high. Une
étape sans marqueur est traitée comme `standard`. Pas de niveau sur
`[decision]`, `[verify]`, `[firmware]` ni sur la partie matérielle de `[bord]`.

Classer avec la grille d'`execute-plan`
([Profil `auto`](../execute-plan/SKILL.md#profil-auto--routage-par-complexité)) :

- **`complexe`** dès qu'un critère est vrai : architecture ou nouveau module
  structurant ; modèle de domaine, persistance ou migration de données ; contrat
  entre composants (API, format partagé ou contrat entre composants) ; plusieurs sous-projets
  ou dépôts dans l'étape ; concurrence, temps réel, rejeu ou performance ;
  sécurité, autorité de contrôle ; spécification ambiguë ou écarts à arbitrer.
- **`simple`** seulement si tout est vrai : spécification explicite sans choix
  de conception ; un ou deux fichiers d'un seul sous-projet ; travail mécanique
  (documentation, config, renommage, textes d'interface et traductions, tests
  écrits contre un contrat explicite, ajustement de style).
- **`standard`** sinon.

En cas de doute entre deux niveaux, choisir le plus haut : une étape classée
trop bas coûte une itération ratée avant la montée de palier automatique, une
étape classée trop haut ne coûte que quelques tokens de plus.

**Backwards-compat** — plans written before this convention may have untagged
bullets. The orchestrator tolerates them but will ask the user to confirm an
inferred role at execution start, without modifying the source artifact.

When generating a new artifact via this skill, populate section 6 with tagged
bullets following the template at
[`assets/artifact-template.md`](assets/artifact-template.md).
