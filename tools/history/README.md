# tools/history — suivi d'exécution des plans

`run-tracker.mjs` publie l'avancement d'un plan **pendant** son exécution par
la skill [`execute-plan`](../../.claude/skills/execute-plan/SKILL.md). Ce
document est le **contrat** de ce qu'il écrit : emplacement, formats, états,
règles de transition, exemples. Il s'adresse à tout lecteur de ces fichiers —
l'orchestrateur lui-même (reprise), le `documenter` (journal), un humain
(`status`), ou un outil externe comme le mod Claude Code de consultation des
plans.

- Schéma : `workflow-run-state/1`.
- Node ESM, sans dépendance. Tests : `node --test "tools/history/*.test.mjs"`.
- Exemples réels, produits par l'outil : [`examples/`](examples/).

## 1. Principe

L'orchestrateur appelle l'outil à chaque transition. L'outil horodate,
numérote, valide et écrit ; il ne lance aucun agent, n'appelle aucune IA et ne
lit que le frontmatter du plan. Les subagents n'y écrivent jamais.

Lire ces fichiers ne demande ni IA, ni git, ni réseau : ce sont un JSON et un
JSONL, en UTF-8, fins de ligne LF.

Ce que le suivi apporte au workflow, avec ou sans lecteur externe :

- **reprise** d'une exécution interrompue, y compris après une session perdue ;
- **résistance à la compaction** du contexte de la session orchestratrice ;
- **journal composé depuis des faits** : le `documenter` lit l'instantané ;
- **consultation sans IA** : `node tools/history/run-tracker.mjs status` ou
  `list` ;
- **garde-fous** : pas de second run sur un plan en cours, pas de clôture
  `completed` avec des étapes ouvertes, pas de statut de plan consigné que le
  frontmatter ne porte pas.

## 2. Où sont les fichiers

```
<checkout>/documentation/history/executions/
  2026-10-07_14-32_exec_<slug>.md                 journal final (versionné, écrit en clôture)
  .etat/                                          ignoré par git
    2026-10-07_14-32_exec_<slug>.events.jsonl     événements, ajout seul — fait foi
    2026-10-07_14-32_exec_<slug>.state.json       instantané dérivé — à lire en premier
    2026-10-07_14-32_exec_<slug>.lock/            verrou d'écriture, éphémère
    init-<slug>.json                              fichier d'ouverture, supprimé après lecture
```

- **`runId`** = `YYYY-MM-DD_HH-mm_exec_<slug>` : horodatage local d'ouverture
  et `slug` du frontmatter du plan. C'est aussi le nom du journal
  (`<runId>.md`). Deux runs ouverts la même minute sur le même plan : le second
  prend le suffixe `-2`.
- **Un plan peut avoir plusieurs runs** (re-run, exécution par tranches). Ils
  se distinguent par leur `runId` ; un seul peut être ouvert à la fois pour un
  même plan dans un même checkout.
- **L'état est propre au checkout** où tourne la session orchestratrice : le
  checkout principal, ou un worktree. Deux worktrees qui exécutent le même plan
  ont chacun leur `.etat/`, sans collision. `checkout.root` et
  `checkout.branch` identifient l'origine.
- **Trouver les worktrees sans lancer git** : dans le checkout principal,
  chaque fichier `.git/worktrees/<nom>/gitdir` contient le chemin du `.git` du
  worktree ; son dossier parent est la racine du worktree. Dans un worktree,
  `.git` est un fichier (`gitdir: …`), pas un dossier.
- **Conservation** : les fichiers restent après la clôture. Ils disparaissent
  avec le worktree ; la trace durable est le journal versionné.
- **Lecture pendant une écriture** : l'instantané est remplacé par renommage
  atomique. Si le renommage est refusé (fichier tenu ouvert sous Windows), il
  est réécrit en place : un lecteur qui obtient un JSON invalide garde sa
  dernière version valide et relit. Une dernière ligne tronquée du JSONL
  s'ignore.

## 3. Trois espaces de statuts

Ils ne se déduisent jamais l'un de l'autre.

| Espace | Champ | Valeurs | Source |
|---|---|---|---|
| Plan | `plan.status` | `plan`, `ready-to-execute`, `executing`, `done` (valeurs historiques conservées brutes) | frontmatter du plan, vérifié par l'outil à chaque consignation |
| Rapport implementer | `steps[].iterations[].implementer.status` | `success`, `partial`, `blocked`, `launch-failed` | rapport du subagent |
| Verdict verifier | `steps[].iterations[].verifier.verdict`, `finalGate.status` | `pass`, `pass-with-notes`, `fail`, `launch-failed` | rapport du subagent |

Deux états dérivés s'y ajoutent :

| | Champ | Valeurs |
|---|---|---|
| Run | `run.status` | `running`, `waiting-user`, `interrupted`, `closed` |
| Issue du run | `run.outcome` | `null`, puis `completed`, `escalated`, `aborted` (vocabulaire du journal) |
| Étape | `steps[].status` | `pending`, `in-progress`, `waiting-user`, `done`, `skipped`, `escalated` |
| Phase d'une étape en cours | `steps[].phase` | `implementing`, `implemented`, `verifying`, `to-correct`, `decision`, `manual`, `null` |
| Clôture d'une étape | `steps[].doneBy` | `verifier`, `decision`, `manual`, `user`, `null` |
| Verdict final (vocabulaire du journal) | `steps[].finalVerdict` | `pass`, `pass-with-notes`, `fail-escalated`, `skipped`, `null` |

À retenir :

- Un `success` d'implementer laisse l'étape `in-progress` (phase
  `implemented`) : **seul un verdict `pass` ou `pass-with-notes` la valide**.
- Un verdict `fail` laisse l'étape `in-progress` (phase `to-correct`) : ce
  n'est une escalade que si le verifier recommande `escalate-to-user`.
- Une étape `done` sans `finalVerdict` n'a pas été validée par le verifier :
  `doneBy` dit par quoi (décision, geste manuel, correctif accepté par
  l'utilisateur).
- `run.status: closed` ne dit rien du plan : `plan.status` reste `executing`
  tant que l'utilisateur n'a pas confirmé `done`
  (`plan.doneConfirmation` : `null` → `confirmed` ou `declined`).
- Le gate final est global : il ne remplit aucune étape.

## 4. L'instantané `<runId>.state.json`

```ts
type RunState = {
  schema: 'workflow-run-state/1';
  runId: string;
  seq: number;                 // numéro du dernier événement appliqué
  updatedAt: string;           // ISO-8601 avec décalage local
  run: {
    status: 'running' | 'waiting-user' | 'interrupted' | 'closed';
    outcome: null | 'completed' | 'escalated' | 'aborted';
    startedAt: string;
    endedAt: string | null;
    session: number;           // 1, puis +1 à chaque reprise
    profile: string | null;    // profil d'exécution courant (auto, opus-5-5…)
    isolation: 'none' | 'worktree';
    gitea: boolean;
    orchestrator: string;      // 'execute-plan'
    wait: null | { step: string | null; reason: WaitReason; note: string | null; since: string };
    interruption: null | { reason: string; note: string | null; at: string };
  };
  plan: {
    artifact: string;          // relatif à documentation/history/ (= relatedPlanArtifact du journal)
    path: string;              // relatif à la racine du checkout
    form: 'mono' | 'sharded';  // forme réellement utilisée par le workflow
    slug: string;
    title: string | null;
    kind: string | null;       // task | fix
    status: string | null;     // statut du frontmatter, tel que consigné
    doneConfirmation: null | 'confirmed' | 'declined';
  };
  checkout: { root: string; branch: string | null; baseline: string | null; worktree: boolean };
  repos: Record<string, { path: string; branch: string | null; baseline: string | null; worktree: boolean }>;
  progress: {
    total: number;             // en étapes du plan : une composite compte pour une
    done: number; skipped: number; escalated: number;
    inProgress: number; waiting: number; pending: number;
    current: string | null;    // identifiant de la ligne en cours ou en attente
    next: string | null;       // première ligne encore `pending`
  };
  agents: { role: Role; agent: string; step: string | null; iteration: number | null;
            mode: VerifierMode | null; since: string }[];   // agents lancés, sans rapport encore
  finalGate: { status: 'pending' | 'running' | 'pass' | 'pass-with-notes' | 'fail' | 'launch-failed';
               runs: number; agent: string | null; at: string | null;
               recommendedAction?: string | null; blocking?: number | null; notes?: number | null };
  journal: { status: 'pending' | 'writing' | 'written' | 'error'; path: string | null };
  composites: { id: string; children: string[]; status: StepStatus }[];
  steps: Step[];               // lignes d'exécution, dans l'ordre
};

type Step = {
  id: string;                  // identifiant du plan, tel quel : '0', '1b', '16a', '29.1' ; sous-étape : '3.a'
  parent: string | null;       // étape composite d'origine ('3' pour '3.a'), sinon null
  tag: string;                 // tag du plan sans crochets : 'backend', 'backend+frontend', 'decision'…
  role: 'backend' | 'frontend' | 'station' | null;   // specialist d'implémentation
  kind: 'agent' | 'decision' | 'manual' | 'verify';
  title: string;
  complexity: 'simple' | 'standard' | 'complexe' | null;
  repo: string;                // clé de `repos` : 'project', 'xplor-station', 'xplor-contracts', 'simulator'
  status: StepStatus;
  phase: 'implementing' | 'implemented' | 'verifying' | 'to-correct' | 'decision' | 'manual' | null;
  attempt: number;             // 0 tant que rien n'a été lancé ; +1 à chaque reprise ou `retry`
  iteration: number;           // itération courante dans la tentative (1 à 3), 0 si aucune
  doneBy: 'verifier' | 'decision' | 'manual' | 'user' | null;
  finalVerdict: 'pass' | 'pass-with-notes' | 'fail-escalated' | 'skipped' | null;
  wait: null | { reason: WaitReason; note: string | null; since: string };
  note: string | null;         // dernière note de décision, de skip ou d'escalade
  files: string[];             // fichiers touchés rapportés, relatifs au dépôt de l'étape (60 au plus)
  startedAt: string | null;
  endedAt: string | null;
  iterations: {
    attempt: number; n: number; tier: 'simple' | 'standard' | 'complexe' | null;
    implementer: null | { agent: string | null; status: 'success' | 'partial' | 'blocked' | 'launch-failed' | null;
                          startedAt: string | null; endedAt: string | null; tokens?: number; note?: string };
    verifier: null | { agent: string | null; mode: VerifierMode | null;
                       verdict: 'pass' | 'pass-with-notes' | 'fail' | 'launch-failed' | null;
                       recommendedAction: 'merge' | 'fix-and-reverify' | 'escalate-to-user' | null;
                       runs: number;   // > 1 si le verifier a été relancé sans nouvelle itération
                       blocking: number | null; notes: number | null;
                       startedAt: string | null; endedAt: string | null; tokens?: number; note?: string };
  }[];
};

type StepStatus = 'pending' | 'in-progress' | 'waiting-user' | 'done' | 'skipped' | 'escalated';
type Role = 'implementer' | 'verifier' | 'documenter';
type VerifierMode = 'docs-config' | 'step' | 'final';
type WaitReason = 'decision' | 'manual' | 'escalation' | 'implementer-blocked' | 'non-conformant-report'
                | 'launch-failure' | 'final-gate-fail' | 'classification' | 'other';
```

Un `status: null` d'implementer ou un `verdict: null` de verifier signifie
« lancé, pas encore de rapport ».

### Étapes, sous-étapes, étapes ajoutées

- `steps` contient les **lignes d'exécution**. Une étape `[backend+frontend]`
  y figure par ses sous-étapes `N.a`, `N.b` (`parent: 'N'`), jamais par
  elle-même ; `composites` donne l'état de l'étape parente.
- `progress` compte en **étapes du plan** : une composite vaut une unité,
  `done` seulement quand toutes ses sous-étapes sont `done` ou `skipped` (et
  pas toutes `skipped`).
- `progress.done` compte les étapes faites, quel que soit `doneBy`. Pour ne
  compter que les validations du verifier, filtrer `doneBy === 'verifier'`.
- Une étape **ajoutée** en cours d'exécution arrive par l'événement
  `step-added` et s'insère après son ancre : le total du run peut dépasser
  celui du document.
- Les étapes sont celles que l'orchestrateur a réellement retenues (tags
  inférés compris). Si le plan est modifié ensuite, l'instantané ne change pas.

### Plans découpés, multi-dépôts

Le tag choisit le rôle, pas le dépôt. Sans `repo`, une étape utilise `project`.
Toute cible extérieure reçoit une clé `repo` explicite, correspondant à une
entrée de `repos`. Les anciens noms de dépôts dans les exemples historiques
sont des clés d'exemple, pas des noms réservés ou des cibles implicites.


- `plan.form` dit quelle forme le workflow a lue. En cas de doublon mono +
  dossier, le mono l'emporte et l'événement `run-started` porte l'avertissement
  `doublon mono + découpé : mono utilisé`.
- `repos` relève, à l'ouverture, la branche et le commit de départ de `project`
  et de chaque dépôt frère déclaré. `steps[].repo` dit où l'étape s'exécute ;
  ses `files` sont relatifs à ce dépôt. L'état, lui, vit toujours dans
  `project`.

## 5. Le journal d'événements `<runId>.events.jsonl`

Une ligne JSON par événement. Champs communs :

```ts
type Event = {
  v: 1;
  seq: number;        // 1, 2, 3… sans trou
  at: string;         // ISO-8601 avec décalage local
  run: string;        // runId
  type: string;
  after: { run: RunStatus; step?: StepStatus };   // états obtenus après application
  warnings?: string[];                            // anomalies de séquence tolérées
  // + champs propres au type
};
```

`after` permet de suivre le fil sans réimplémenter les règles. L'instantané est
exactement la réduction des événements (`reduce` est exporté par
`run-tracker.mjs`, et `rebuild` le recalcule).

| `type` | Champs propres | Effet |
|---|---|---|
| `run-started` | `orchestrator`, `profile`, `isolation`, `gitea`, `plan`, `checkout`, `repos`, `steps[]` | ouvre le run, toutes les étapes `pending` |
| `plan-status` | `from`, `to`, `confirmedBy` (`user` pour `done`) | `plan.status` ; `done` ⇒ `doneConfirmation: confirmed` |
| `plan-done-declined` | — | `doneConfirmation: declined`, le plan reste `executing` |
| `agent-started` | `role`, `agent` (subagent_type), `step?`, `iteration?`, `mode?`, `tier?`, `repo?` | ajoute à `agents` ; implementer ⇒ nouvelle itération, phase `implementing` ; verifier ⇒ phase `verifying` ; sans `step` ⇒ gate final `running` ; documenter ⇒ journal `writing` ; lève toute attente |
| `agent-failed` | `role`, `agent`, `error`, `step?`, `iteration?` | lancement échoué : attente utilisateur `launch-failure` (étape et run) ; aucune validation |
| `agent-report` (implementer) | `step`, `iteration`, `status`, `files?`, `tokens?`, `note?`, `agent?` | phase `implemented` ; `blocked` ⇒ attente `implementer-blocked` |
| `agent-report` (verifier, étape) | `step`, `iteration`, `mode`, `verdict`, `recommendedAction`, `blocking?`, `notes?`, `tokens?`, `note?`, `agent?` | `pass*` ⇒ étape `done` par `verifier` ; `fail` ⇒ phase `to-correct` ; `fail` + `escalate-to-user` ⇒ attente `escalation` |
| `agent-report` (verifier, `mode: final`) | `verdict`, `recommendedAction`, … | `finalGate.status` ; `fail` ⇒ attente `final-gate-fail` |
| `agent-report` (documenter) | `status` (`ok` / `error`), `journal?` | `journal.status` `written` / `error` |
| `step-waiting` | `reason`, `note?`, `step?` | attente utilisateur (étape et run) |
| `user-resolved` | `action`, `note?`, `step?` | lève l'attente ; `done` ⇒ étape `done` (`doneBy` selon `kind`, sinon `user`) ; `skip` ⇒ `skipped` ; `abort` ⇒ `escalated` ; `retry` ⇒ nouvelle tentative, itération remise à 0 ; `continue` ⇒ étape `in-progress` |
| `step-closed` | `step`, `outcome`, `by?`, `note?` | clôture directe d'une étape |
| `step-added` | `def` (étape), `afterStep?` | insère une étape |
| `profile-changed` | `from`, `to`, `reason?` | `run.profile` |
| `run-interrupted` | `reason`, `note?` | run `interrupted` ; les étapes gardent leur phase (on voit où l'exécution s'est arrêtée) |
| `run-resumed` | `session`, `unclean`, `head` | run `running` ; les étapes non closes repartent `pending`, itération 0, tentative +1. `unclean: true` = reprise sans interruption consignée (session perdue) |
| `run-closed` | `outcome`, `journal?` | run `closed` |
| `note` | `text`, `step?` | note libre |

Après `run-closed`, seuls `plan-status`, `plan-done-declined` et `note` sont
acceptés.

## 6. Lire l'avancement : règles pour un lecteur

- **Lire l'instantané**, pas le JSONL, pour l'affichage courant. Le JSONL sert
  à l'historique détaillé et à reconstruire.
- **Fraîcheur** : `updatedAt` ne bouge qu'aux transitions. Un agent peut
  travailler longtemps sans événement : tant que `agents` n'est pas vide,
  l'absence de nouvelles est normale (`agents[].since` date le lancement). Un
  run `running` sans agent ni attente, resté longtemps sans mise à jour, est
  probablement une session perdue : il n'est ni terminé ni en échec, et sera
  repris par `run-resumed` (`unclean: true`).
- **Lancement en arrière-plan** : `agent-started` est publié avant l'appel
  `Agent`, le rapport à son retour. Entre les deux, l'agent est dans `agents`.
- **Échec de lancement** : ni `fail`, ni `blocked`. L'itération porte
  `launch-failed`, l'étape attend l'utilisateur (`launch-failure`).
- **Rattachement au plan** : `plan.artifact` et `checkout.root` suffisent ; ne
  jamais rattacher sur le seul numéro d'étape.
- **Journal** : `journal.path` une fois écrit ; à défaut
  `documentation/history/executions/<runId>.md`.
- **Pas de rétroaction** : les exécutions antérieures à ce suivi n'ont pas de
  fichier d'état. Leurs journaux, plans et index ne sont pas modifiés ; un plan
  `executing` sans run est simplement « avancement inconnu ».
- **Avertissements** : un événement avec `warnings` a été accepté malgré une
  anomalie de séquence (rapport sans lancement consigné, par exemple). Les
  faits qu'il porte restent ceux du rapport.

## 7. Exemples

Deux runs complets, produits par l'outil, sont dans [`examples/`](examples/) ;
un test vérifie qu'ils restent la réduction exacte de leurs événements.

### 7.1 Correction puis validation, jusqu'à `done`

`2026-10-07_07-45_exec_alertes-accuse-reception` — plan mono, profil `auto`,
une décision, une étape corrigée, une étape composite, une étape ignorée.

Décision utilisateur (étape 1) :

```json
{"v":1,"seq":3,"at":"2026-10-07T07:45:20+02:00","run":"2026-10-07_07-45_exec_alertes-accuse-reception","type":"step-waiting","reason":"decision","note":"30 jours ou durée de la mission ?","step":"1","after":{"run":"waiting-user","step":"waiting-user"}}
{"v":1,"seq":4,"at":"2026-10-07T07:45:20+02:00","run":"2026-10-07_07-45_exec_alertes-accuse-reception","type":"user-resolved","action":"done","note":"Durée de la mission","step":"1","after":{"run":"running","step":"done"}}
```

Étape 2 : implémentation, échec du verifier, correction avec montée de palier,
validation :

```json
{"v":1,"seq":5,"at":"2026-10-07T07:45:20+02:00","run":"…","type":"agent-started","role":"implementer","agent":"backend-implementer-sonnet-5-5","step":"2","repo":"project","iteration":1,"tier":"simple","after":{"run":"running","step":"in-progress"}}
{"v":1,"seq":6,"at":"2026-10-07T07:45:20+02:00","run":"…","type":"agent-report","role":"implementer","tokens":38200,"status":"success","files":["backend/services/alertAckService.js","backend/test/alertAckService.test.js"],"step":"2","iteration":1,"agent":"backend-implementer-sonnet-5-5","after":{"run":"running","step":"in-progress"}}
{"v":1,"seq":7,"at":"2026-10-07T07:45:20+02:00","run":"…","type":"agent-started","role":"verifier","agent":"verifier-opus-5-5","step":"2","repo":"project","mode":"step","iteration":1,"after":{"run":"running","step":"in-progress"}}
{"v":1,"seq":8,"at":"2026-10-07T07:45:20+02:00","run":"…","type":"agent-report","role":"verifier","tokens":21400,"note":"Horodatage sans TimeQuality","mode":"step","verdict":"fail","recommendedAction":"fix-and-reverify","blocking":1,"step":"2","iteration":1,"agent":"verifier-opus-5-5","after":{"run":"running","step":"in-progress"}}
{"v":1,"seq":9,"at":"2026-10-07T07:45:20+02:00","run":"…","type":"agent-started","role":"implementer","agent":"backend-implementer-opus-5-5-medium","step":"2","repo":"project","iteration":2,"tier":"standard","after":{"run":"running","step":"in-progress"}}
{"v":1,"seq":12,"at":"2026-10-07T07:45:21+02:00","run":"…","type":"agent-report","role":"verifier","tokens":19800,"mode":"step","verdict":"pass","recommendedAction":"merge","step":"2","iteration":2,"agent":"verifier-opus-5-5","after":{"run":"running","step":"done"}}
```

(`"run":"…"` abrège ici le `runId` ; les fichiers d'exemple le portent en
entier.) L'étape 2 dans l'instantané final, abrégée :

```json
{
 "id": "2", "parent": null, "tag": "backend", "role": "backend", "kind": "agent",
 "title": "Service d'accusé de réception", "complexity": "simple", "repo": "project",
 "status": "done", "phase": null, "attempt": 1, "iteration": 2,
 "doneBy": "verifier", "finalVerdict": "pass",
 "files": ["backend/services/alertAckService.js", "backend/test/alertAckService.test.js"],
 "iterations": [
  { "attempt": 1, "n": 1, "tier": "simple",
    "implementer": { "agent": "backend-implementer-sonnet-5-5", "status": "success", "tokens": 38200 },
    "verifier": { "agent": "verifier-opus-5-5", "mode": "step", "verdict": "fail",
                  "recommendedAction": "fix-and-reverify", "runs": 1, "blocking": 1,
                  "note": "Horodatage sans TimeQuality" } },
  { "attempt": 1, "n": 2, "tier": "standard",
    "implementer": { "agent": "backend-implementer-opus-5-5-medium", "status": "success", "tokens": 27900 },
    "verifier": { "agent": "verifier-opus-5-5", "mode": "step", "verdict": "pass",
                  "recommendedAction": "merge", "runs": 1 } }
 ]
}
```

Étape ignorée, clôture du run, puis confirmation de `done` par l'utilisateur
(deux faits distincts) :

```json
{"v":1,"seq":21,"at":"2026-10-07T07:45:21+02:00","run":"…","type":"step-closed","step":"4","outcome":"skipped","note":"Reportée à la demande de l'utilisateur","after":{"run":"running","step":"skipped"}}
{"v":1,"seq":26,"at":"2026-10-07T07:45:22+02:00","run":"…","type":"run-closed","outcome":"completed","after":{"run":"closed"}}
{"v":1,"seq":27,"at":"2026-10-07T07:45:22+02:00","run":"…","type":"plan-status","from":"executing","to":"done","confirmedBy":"user","after":{"run":"closed"}}
```

État final, abrégé :

```json
{
 "run": { "status": "closed", "outcome": "completed", "session": 1, "profile": "auto" },
 "plan": { "artifact": "tasks/2026-10-06_15-10_task_alertes-accuse-reception.md", "form": "mono",
           "status": "done", "doneConfirmation": "confirmed" },
 "progress": { "total": 4, "done": 3, "skipped": 1, "escalated": 0, "inProgress": 0,
               "waiting": 0, "pending": 0, "current": null, "next": null },
 "finalGate": { "status": "pass", "runs": 1, "agent": "verifier-opus-5-5" },
 "journal": { "status": "written",
              "path": "documentation/history/executions/2026-10-07_07-45_exec_alertes-accuse-reception.md" },
 "composites": [ { "id": "3", "children": ["3.a", "3.b"], "status": "done" } ]
}
```

### 7.2 Échec de lancement, interruption, reprise — run en cours

`2026-10-07_07-45_exec_passerelle-telemetrie` — plan découpé, multi-dépôts,
profil `opus-5-5`.

```json
{"v":1,"seq":4,"at":"2026-10-07T07:45:23+02:00","run":"…","type":"agent-failed","role":"implementer","agent":"station-implementer-opus-5-5","error":"Modèle claude-opus-5-5 refusé : Claude Code 2.1.279 < 2.1.280","step":"1","iteration":1,"after":{"run":"waiting-user","step":"waiting-user"}}
{"v":1,"seq":5,"at":"2026-10-07T07:45:23+02:00","run":"…","type":"run-interrupted","reason":"model-refused","note":"Mettre à jour Claude Code puis reprendre","after":{"run":"interrupted"}}
{"v":1,"seq":6,"at":"2026-10-07T07:45:23+02:00","run":"…","type":"run-resumed","session":2,"unclean":false,"head":"821d8195f143f5b14742360190e0037f5004e38a","after":{"run":"running"}}
```

Instantané après reprise, étape 1 validée et étape 2 en cours d'implémentation
(abrégé) :

```json
{
 "schema": "workflow-run-state/1",
 "runId": "2026-10-07_07-45_exec_passerelle-telemetrie",
 "seq": 11,
 "updatedAt": "2026-10-07T07:45:24+02:00",
 "run": { "status": "running", "outcome": null, "session": 2, "profile": "opus-5-5",
          "wait": null, "interruption": null },
 "plan": { "artifact": "tasks/2026-10-06_16-20_task_passerelle-telemetrie/index.md",
           "form": "sharded", "status": "executing", "doneConfirmation": null },
 "repos": {
  "project": { "path": "C:/DEV/project", "branch": "claude/exemple-suivi", "baseline": "821d8195…" },
  "xplor-contracts": { "path": "C:/DEV/xplor-contracts", "branch": "main", "baseline": "4d43817b…" },
  "xplor-station": { "path": "C:/DEV/xplor-station", "branch": "main", "baseline": "79417218…" }
 },
 "progress": { "total": 4, "done": 1, "skipped": 0, "escalated": 0, "inProgress": 1,
               "waiting": 0, "pending": 2, "current": "2", "next": "3" },
 "agents": [ { "role": "implementer", "agent": "station-implementer-opus-5-5", "step": "2",
               "iteration": 1, "mode": null, "since": "2026-10-07T07:45:24+02:00" } ],
 "finalGate": { "status": "pending", "runs": 0 },
 "journal": { "status": "pending", "path": null }
}
```

L'étape 1 garde la trace de la tentative échouée : `attempt: 2`, et
`iterations` = `[{attempt 1, n 1, implementer.status "launch-failed"},
{attempt 2, n 1, implementer "success", verifier "pass"}]`. L'étape 3
(`tag: "bord"`, `kind: "manual"`, `repo: "xplor-station"`) est un geste sur le
banc : elle passera par `step-waiting` (`manual`) puis `user-resolved`
(`done`), avec `doneBy: "manual"` et sans verdict.

### 7.3 Sortie de `status`

```
Run 2026-10-07_07-45_exec_passerelle-telemetrie — running — session 2 — profil opus-5-5
Plan tasks/2026-10-06_16-20_task_passerelle-telemetrie/index.md (sharded) — status executing
Avancement 1/4 faites · 0 ignorées · 0 escaladées · en cours : 2 · suivante : 3
Agent en cours : implementer station-implementer-opus-5-5 — étape 2 depuis 2026-10-07T07:45:24+02:00
  [x] 1 [contract] Schéma du message de télémétrie — 1 it., pass, xplor-contracts
  [>] 2 [station] Publication par la passerelle — implementing, 1 it., xplor-station
  [ ] 3 [bord] Relevé d'horloge sur le banc — xplor-station
  [ ] 4 [backend] Ingestion côté pont MQTT
Gate final : pending · Journal : pending
```

Marques : `[ ]` à faire, `[>]` en cours, `[?]` attente utilisateur, `[x]`
faite, `[-]` ignorée, `[!]` escaladée.

## 8. Commandes

`node tools/history/run-tracker.mjs help` liste les commandes ; la procédure
d'emploi par l'orchestrateur est dans
[`execute-plan/SKILL.md`](../../.claude/skills/execute-plan/SKILL.md#suivi-dexécution-publié).

- Sortie `0` et une ligne `ok #<seq> <type> — run <état> — étape <n> <état>` ;
  lignes `warn:` éventuelles.
- Sortie `2` et `erreur: …` : valeur hors énumération, étape inconnue, étape
  déjà close, run clos, statut de plan absent du frontmatter, clôture
  `completed` avec étapes ouvertes. **Rien n'est écrit.**
- `--run <runId>` choisit le run ; sans lui, l'unique run ouvert du checkout,
  à défaut le plus récent (lectures et confirmation de `done`).
- `--root <checkout>` ou `WORKFLOW_REPO_ROOT` visent un autre checkout ; par
  défaut, celui qui contient l'outil.
- Notes tronquées à 2 000 caractères.

## 9. Compatibilité et suites

- **Historique préservé** : aucun plan, journal, brief ni index existant n'est
  modifié ou migré. Le format du journal d'exécution est inchangé ; seul son
  nom est désormais aligné sur le `runId` (même convention qu'avant).
- **Plan `workflow-emprunts-bmad`** (`ready-to-execute`) : son lot B (étapes 5
  et 6, état persistant et reprise) est couvert par ce suivi, avec trois
  écarts assumés — un fichier par run et non par slug, des clés en anglais, et
  un état conservé après clôture. Ce plan n'a pas été modifié : à réconcilier
  avant de l'exécuter. Son bloc `livraison` et `tools/history/chantiers.mjs` ne
  sont pas livrés ici.
- **Évolution du schéma** : un ajout de champ ou de type d'événement garde
  `workflow-run-state/1` — un lecteur ignore ce qu'il ne connaît pas. Un
  changement de sens d'un champ existant passera à `/2`.
