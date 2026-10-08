#!/usr/bin/env node
// Suivi d'exécution des plans — publication déterministe de l'état d'un run.
//
// Appelé par l'orchestrateur `execute-plan` à chaque transition (lancement d'agent,
// rapport, attente utilisateur, interruption, reprise, clôture). Écrit deux fichiers
// par run sous `documentation/history/executions/.etat/` :
//   <runId>.events.jsonl — journal d'événements en ajout seul (source de vérité) ;
//   <runId>.state.json   — instantané dérivé, réécrit à chaque événement.
// Contrat complet et exemples : tools/history/README.md.
//
// Node ESM, sans dépendance. Tests : node --test "tools/history/*.test.mjs"

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'workflow-run-state/1';
export const STATE_DIR = 'documentation/history/executions/.etat';

const HISTORY_DIR = 'documentation/history';
const NOTE_MAX = 2000;
const FILES_MAX = 60;

const ROLES = ['implementer', 'verifier', 'documenter'];
const IMPLEMENTER_STATUS = ['success', 'partial', 'blocked'];
const VERIFIER_MODES = ['docs-config', 'step', 'final'];
const VERDICTS = ['pass', 'pass-with-notes', 'fail'];
const ACTIONS = ['merge', 'fix-and-reverify', 'escalate-to-user'];
const WAIT_REASONS = [
  'decision',
  'manual',
  'escalation',
  'implementer-blocked',
  'non-conformant-report',
  'launch-failure',
  'final-gate-fail',
  'classification',
  'other',
];
const RESOLVE_ACTIONS = ['continue', 'retry', 'done', 'skip', 'abort'];
const STEP_OUTCOMES = ['done', 'skipped', 'escalated'];
const DONE_BY = ['verifier', 'decision', 'manual', 'user'];
const RUN_OUTCOMES = ['completed', 'escalated', 'aborted'];
const STEP_KINDS = ['agent', 'decision', 'manual', 'verify'];
const COMPLEXITIES = ['simple', 'standard', 'complexe'];
const TERMINAL = new Set(STEP_OUTCOMES);

class TrackerError extends Error {}

function fail(message) {
  throw new TrackerError(message);
}

// ---------------------------------------------------------------------------
// Réducteur pur : événements → instantané
// ---------------------------------------------------------------------------

function findStep(state, id) {
  return state.steps.find((step) => step.id === id) ?? null;
}

function currentIteration(step) {
  return step.iterations.at(-1) ?? null;
}

function setWait(state, step, reason, note, at) {
  const wait = { reason, note: note ?? null, since: at };
  if (step) {
    step.status = 'waiting-user';
    step.wait = wait;
    step.startedAt ??= at;
  }
  state.run.status = 'waiting-user';
  state.run.wait = { step: step ? step.id : null, ...wait };
}

function clearRunWait(state) {
  state.run.wait = null;
  if (state.run.status === 'waiting-user') state.run.status = 'running';
}

function closeStep(state, step, outcome, by, finalVerdict, note, at) {
  step.status = outcome;
  step.phase = null;
  step.wait = null;
  step.doneBy = outcome === 'done' ? by : null;
  step.finalVerdict = finalVerdict;
  if (note) step.note = note;
  step.startedAt ??= at;
  step.endedAt = at;
  if (state.run.wait && state.run.wait.step === step.id) clearRunWait(state);
}

function dropAgent(state, role, stepId) {
  const index = state.agents.findIndex((agent) => agent.role === role && agent.step === stepId);
  if (index >= 0) state.agents.splice(index, 1);
}

function newStep(def) {
  return {
    id: def.id,
    parent: def.parent ?? null,
    tag: def.tag,
    role: def.role ?? null,
    kind: def.kind,
    title: def.title,
    complexity: def.complexity ?? null,
    repo: def.repo,
    status: 'pending',
    phase: null,
    attempt: 0,
    iteration: 0,
    doneBy: null,
    finalVerdict: null,
    wait: null,
    note: null,
    files: [],
    startedAt: null,
    endedAt: null,
    iterations: [],
  };
}

function groupStatus(children) {
  const statuses = children.map((child) => child.status);
  if (statuses.includes('waiting-user')) return 'waiting-user';
  if (statuses.includes('escalated')) return 'escalated';
  if (statuses.every((status) => status === 'skipped')) return 'skipped';
  if (statuses.every((status) => status === 'done' || status === 'skipped')) return 'done';
  if (statuses.every((status) => status === 'pending')) return 'pending';
  return 'in-progress';
}

// L'avancement se compte en étapes du plan : une étape composite (`1.a`, `1.b`)
// vaut une unité, validée seulement quand toutes ses sous-étapes le sont.
function recompute(state) {
  const units = [];
  const byParent = new Map();
  for (const step of state.steps) {
    if (!step.parent) {
      units.push({ id: step.id, status: step.status });
      continue;
    }
    if (!byParent.has(step.parent)) {
      const unit = { id: step.parent, children: [] };
      byParent.set(step.parent, unit);
      units.push(unit);
    }
    byParent.get(step.parent).children.push(step);
  }
  state.composites = [];
  const count = { done: 0, skipped: 0, escalated: 0, inProgress: 0, waiting: 0, pending: 0 };
  for (const unit of units) {
    if (unit.children) {
      unit.status = groupStatus(unit.children);
      state.composites.push({
        id: unit.id,
        children: unit.children.map((child) => child.id),
        status: unit.status,
      });
    }
    if (unit.status === 'done') count.done += 1;
    else if (unit.status === 'skipped') count.skipped += 1;
    else if (unit.status === 'escalated') count.escalated += 1;
    else if (unit.status === 'waiting-user') count.waiting += 1;
    else if (unit.status === 'in-progress') count.inProgress += 1;
    else count.pending += 1;
  }
  const active = state.steps.find(
    (step) => step.status === 'in-progress' || step.status === 'waiting-user',
  );
  const next = state.steps.find((step) => step.status === 'pending');
  state.progress = {
    total: units.length,
    ...count,
    current: active ? active.id : null,
    next: next ? next.id : null,
  };
}

function ensureIteration(step, ev) {
  if (step.attempt === 0) step.attempt = 1;
  if (step.iteration === 0) {
    step.iteration = ev.iteration ?? 1;
    step.iterations.push({
      attempt: step.attempt,
      n: step.iteration,
      tier: null,
      implementer: null,
      verifier: null,
    });
  }
  return currentIteration(step);
}

export function applyEvent(previous, ev) {
  if (ev.type === 'run-started') {
    const state = {
      schema: SCHEMA,
      runId: ev.run,
      seq: ev.seq,
      updatedAt: ev.at,
      run: {
        status: 'running',
        outcome: null,
        startedAt: ev.at,
        endedAt: null,
        session: 1,
        profile: ev.profile,
        isolation: ev.isolation,
        gitea: ev.gitea,
        orchestrator: ev.orchestrator,
        wait: null,
        interruption: null,
      },
      plan: { ...ev.plan, doneConfirmation: null },
      checkout: ev.checkout,
      repos: ev.repos,
      progress: null,
      agents: [],
      finalGate: { status: 'pending', runs: 0, agent: null, at: null },
      journal: { status: 'pending', path: null },
      composites: [],
      steps: ev.steps.map(newStep),
    };
    recompute(state);
    return state;
  }
  if (!previous) fail(`événement ${ev.type} sans run-started préalable`);
  const state = structuredClone(previous);
  const step = ev.step ? findStep(state, ev.step) : null;
  const at = ev.at;

  switch (ev.type) {
    case 'plan-status':
      state.plan.status = ev.to;
      if (ev.to === 'done') state.plan.doneConfirmation = 'confirmed';
      break;

    case 'plan-done-declined':
      state.plan.doneConfirmation = 'declined';
      break;

    case 'agent-started': {
      state.agents.push({
        role: ev.role,
        agent: ev.agent,
        step: ev.step ?? null,
        iteration: ev.iteration ?? null,
        mode: ev.mode ?? null,
        since: at,
      });
      if (state.run.status === 'waiting-user' || state.run.status === 'interrupted') {
        state.run.status = 'running';
        state.run.wait = null;
      }
      if (ev.role === 'documenter') {
        state.journal.status = 'writing';
      } else if (!step) {
        state.finalGate = { ...state.finalGate, status: 'running', agent: ev.agent, at };
        state.finalGate.runs += 1;
      } else if (ev.role === 'implementer') {
        if (step.attempt === 0) step.attempt = 1;
        step.status = 'in-progress';
        step.phase = 'implementing';
        step.wait = null;
        step.startedAt ??= at;
        step.iteration = ev.iteration;
        step.iterations.push({
          attempt: step.attempt,
          n: ev.iteration,
          tier: ev.tier ?? null,
          implementer: { agent: ev.agent, status: null, startedAt: at, endedAt: null },
          verifier: null,
        });
      } else {
        step.status = 'in-progress';
        step.phase = 'verifying';
        step.wait = null;
        step.startedAt ??= at;
        const iteration = ensureIteration(step, ev);
        iteration.verifier = {
          agent: ev.agent,
          mode: ev.mode ?? null,
          verdict: null,
          recommendedAction: null,
          runs: (iteration.verifier?.runs ?? 0) + 1,
          startedAt: at,
          endedAt: null,
        };
      }
      break;
    }

    case 'agent-failed': {
      dropAgent(state, ev.role, ev.step ?? null);
      if (ev.role === 'documenter') {
        state.journal.status = 'error';
        setWait(state, null, 'launch-failure', ev.error, at);
      } else if (!step) {
        state.finalGate = { ...state.finalGate, status: 'launch-failed', at };
        setWait(state, null, 'launch-failure', ev.error, at);
      } else {
        const iteration = currentIteration(step);
        const slot = iteration?.[ev.role];
        if (slot) {
          slot[ev.role === 'implementer' ? 'status' : 'verdict'] = 'launch-failed';
          slot.endedAt = at;
        }
        setWait(state, step, 'launch-failure', ev.error, at);
      }
      break;
    }

    case 'agent-report': {
      dropAgent(state, ev.role, ev.step ?? null);
      if (ev.role === 'documenter') {
        state.journal = {
          status: ev.status === 'ok' ? 'written' : 'error',
          path: ev.journal ?? state.journal.path,
        };
      } else if (ev.role === 'verifier' && !step) {
        state.finalGate = {
          ...state.finalGate,
          status: ev.verdict,
          recommendedAction: ev.recommendedAction ?? null,
          blocking: ev.blocking ?? null,
          notes: ev.notes ?? null,
          at,
        };
        if (ev.verdict === 'fail') setWait(state, null, 'final-gate-fail', ev.note, at);
      } else if (ev.role === 'implementer') {
        const iteration = ensureIteration(step, ev);
        iteration.implementer = {
          ...(iteration.implementer ?? { agent: ev.agent ?? null, startedAt: null }),
          status: ev.status,
          endedAt: at,
          ...(ev.tokens != null ? { tokens: ev.tokens } : {}),
          ...(ev.note ? { note: ev.note } : {}),
        };
        for (const file of ev.files ?? []) {
          if (!step.files.includes(file) && step.files.length < FILES_MAX) step.files.push(file);
        }
        step.status = 'in-progress';
        step.phase = 'implemented';
        if (ev.status === 'blocked') setWait(state, step, 'implementer-blocked', ev.note, at);
      } else {
        const iteration = ensureIteration(step, ev);
        iteration.verifier = {
          ...(iteration.verifier ?? { agent: ev.agent ?? null, runs: 1, startedAt: null }),
          mode: ev.mode,
          verdict: ev.verdict,
          recommendedAction: ev.recommendedAction ?? null,
          blocking: ev.blocking ?? null,
          notes: ev.notes ?? null,
          endedAt: at,
          ...(ev.tokens != null ? { tokens: ev.tokens } : {}),
          ...(ev.note ? { note: ev.note } : {}),
        };
        if (ev.verdict === 'fail') {
          step.status = 'in-progress';
          step.phase = 'to-correct';
          if (ev.recommendedAction === 'escalate-to-user') {
            setWait(state, step, 'escalation', ev.note, at);
          }
        } else {
          closeStep(state, step, 'done', 'verifier', ev.verdict, null, at);
        }
      }
      break;
    }

    case 'step-waiting':
      if (step && (step.kind === 'decision' || step.kind === 'manual')) step.phase = step.kind;
      setWait(state, step, ev.reason, ev.note, at);
      break;

    case 'user-resolved': {
      clearRunWait(state);
      if (!step) break;
      if (ev.action === 'done') {
        const by = step.kind === 'decision' || step.kind === 'manual' ? step.kind : 'user';
        closeStep(state, step, 'done', by, null, ev.note, at);
      } else if (ev.action === 'skip') {
        closeStep(state, step, 'skipped', null, 'skipped', ev.note, at);
      } else if (ev.action === 'abort') {
        closeStep(state, step, 'escalated', null, 'fail-escalated', ev.note, at);
      } else {
        step.wait = null;
        step.status = 'in-progress';
        if (ev.note) step.note = ev.note;
        if (ev.action === 'retry') {
          step.attempt += 1;
          step.iteration = 0;
          step.phase = null;
        }
      }
      break;
    }

    case 'step-closed': {
      const verdict =
        ev.outcome === 'skipped' ? 'skipped' : ev.outcome === 'escalated' ? 'fail-escalated' : null;
      closeStep(state, step, ev.outcome, ev.by ?? 'user', verdict, ev.note, at);
      break;
    }

    case 'step-added': {
      const added = newStep(ev.def);
      const anchor = ev.afterStep
        ? state.steps.findLastIndex((item) => item.id === ev.afterStep || item.parent === ev.afterStep)
        : -1;
      if (anchor >= 0) state.steps.splice(anchor + 1, 0, added);
      else state.steps.push(added);
      break;
    }

    case 'profile-changed':
      state.run.profile = ev.to;
      break;

    case 'run-interrupted':
      state.run.status = 'interrupted';
      state.run.interruption = { reason: ev.reason, note: ev.note ?? null, at };
      state.agents = [];
      break;

    case 'run-resumed':
      state.run.status = 'running';
      state.run.session = ev.session;
      state.run.wait = null;
      state.run.interruption = null;
      state.agents = [];
      // Reprise à la première étape non terminée, depuis son itération 1.
      for (const item of state.steps) {
        if (TERMINAL.has(item.status) || item.status === 'pending') continue;
        item.status = 'pending';
        item.phase = null;
        item.wait = null;
        item.iteration = 0;
        item.attempt += 1;
      }
      if (state.finalGate.status === 'running') state.finalGate.status = 'pending';
      if (state.journal.status === 'writing') state.journal.status = 'pending';
      break;

    case 'run-closed':
      state.run.status = 'closed';
      state.run.outcome = ev.outcome;
      state.run.endedAt = at;
      state.run.wait = null;
      state.agents = [];
      if (ev.journal) state.journal = { status: 'written', path: ev.journal };
      break;

    case 'note':
      if (step) step.note = ev.text;
      break;

    default:
      fail(`type d'événement inconnu : ${ev.type}`);
  }

  state.seq = ev.seq;
  state.updatedAt = at;
  recompute(state);
  return state;
}

export function reduce(events) {
  let state = null;
  for (const ev of events) state = applyEvent(state, ev);
  return state;
}

// ---------------------------------------------------------------------------
// Entrées / sorties
// ---------------------------------------------------------------------------

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

export function isoLocal(date) {
  const pad = (n, width = 2) => String(Math.trunc(Math.abs(n))).padStart(width, '0');
  const offset = -date.getTimezoneOffset();
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${offset >= 0 ? '+' : '-'}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function describeRepo(repoPath) {
  const root = toPosix(path.resolve(repoPath));
  let worktree = false;
  try {
    worktree = fs.statSync(path.join(root, '.git')).isFile();
  } catch {
    worktree = false;
  }
  return {
    path: root,
    branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    baseline: git(root, ['rev-parse', 'HEAD']),
    worktree,
  };
}

function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    let value = pair[2].trim();
    const quoted = /^(["'])(.*)\1\s*(#.*)?$/.exec(value);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, '');
    fields[pair[1]] = value;
  }
  return fields;
}

// Même règle que la Phase 1.0 d'execute-plan : mono prioritaire, sinon découpé.
function resolvePlan(root, given) {
  const absolute = path.resolve(root, given);
  let base = absolute.replace(/\.md$/i, '');
  if (/[\\/]index$/i.test(base) && fs.existsSync(absolute)) base = path.dirname(absolute);
  const mono = `${base}.md`;
  const sharded = path.join(base, 'index.md');
  const hasMono = fs.existsSync(mono);
  const hasSharded = fs.existsSync(sharded);
  if (!hasMono && !hasSharded) fail(`plan introuvable : ${given}`);
  const file = hasMono ? mono : sharded;
  const repoRelative = toPosix(path.relative(root, file));
  const historyPrefix = `${HISTORY_DIR}/`;
  return {
    file,
    form: hasMono ? 'mono' : 'sharded',
    duplicate: hasMono && hasSharded,
    path: repoRelative,
    artifact: repoRelative.startsWith(historyPrefix)
      ? repoRelative.slice(historyPrefix.length)
      : repoRelative,
  };
}

function stateDir(root) {
  return path.join(root, STATE_DIR);
}

function eventsFile(root, runId) {
  return path.join(stateDir(root), `${runId}.events.jsonl`);
}

function snapshotFile(root, runId) {
  return path.join(stateDir(root), `${runId}.state.json`);
}

export function readEvents(root, runId) {
  const file = eventsFile(root, runId);
  if (!fs.existsSync(file)) fail(`run inconnu : ${runId}`);
  const events = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Une ligne tronquée (écriture interrompue) est ignorée : l'état se reconstruit
      // depuis les événements complets.
    }
  }
  return events;
}

function listRunIds(root) {
  const dir = stateDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.events.jsonl'))
    .map((name) => name.slice(0, -'.events.jsonl'.length))
    .sort();
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withLock(root, runId, work) {
  const lock = path.join(stateDir(root), `${runId}.lock`);
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const age = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? 0);
      if (age > 10_000) fs.rmSync(lock, { recursive: true, force: true });
      else if (attempt > 100) fail(`verrou occupé : ${lock}`);
      else sleep(40);
    }
  }
  try {
    return work();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

function writeSnapshot(root, state) {
  const file = snapshotFile(root, state.runId);
  const temp = `${file}.tmp`;
  const text = `${JSON.stringify(state, null, 1)}\n`;
  fs.writeFileSync(temp, text);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.renameSync(temp, file);
      return;
    } catch {
      // Sous Windows, un lecteur qui tient le fichier ouvert fait échouer le renommage.
      sleep(30);
    }
  }
  fs.writeFileSync(file, text);
  fs.rmSync(temp, { force: true });
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) fail(`argument inattendu : ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) flags[key] = true;
    else {
      flags[key] = value;
      index += 1;
    }
  }
  return flags;
}

function oneOf(name, value, allowed, { required = true } = {}) {
  if (value === undefined || value === true) {
    if (required) fail(`--${name} requis (${allowed.join(' | ')})`);
    return null;
  }
  if (!allowed.includes(value)) fail(`--${name} invalide : ${value} (${allowed.join(' | ')})`);
  return value;
}

function text(value) {
  if (value === undefined || value === true) return null;
  const clean = String(value).replace(/\s+/g, ' ').trim();
  return clean.length > NOTE_MAX ? `${clean.slice(0, NOTE_MAX - 1)}…` : clean || null;
}

function integer(name, value) {
  if (value === undefined || value === true) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) fail(`--${name} doit être un entier positif`);
  return parsed;
}

function normalizeStep(raw, warnings) {
  const id = raw.id == null ? '' : String(raw.id).trim();
  if (!id) fail('étape sans identifiant');
  const tag = String(raw.tag ?? '').replace(/^\[|\]$/g, '').trim();
  if (!tag) fail(`étape ${id} : tag requis`);
  const title = text(raw.title);
  if (!title) fail(`étape ${id} : titre requis`);
  const first = tag.split('+')[0];
  const inferredParent = /^(.+)\.[a-z]$/.exec(id);
  const parent = raw.parent != null ? String(raw.parent) : tag.includes('+') && inferredParent ? inferredParent[1] : null;
  const kind =
    raw.kind ??
    (first === 'decision' ? 'decision' : first === 'firmware' ? 'manual' : first === 'verify' ? 'verify' : 'agent');
  oneOf(`kind (étape ${id})`, kind, STEP_KINDS);
  const roleByTag = {
    backend: 'backend',
    docs: 'backend',
    infra: 'backend',
    simulator: 'backend',
    frontend: 'frontend',
    station: 'station',
    bord: 'station',
    contract: 'station',
  };
  let role = raw.role ?? null;
  if (kind === 'agent' && !role) {
    if (tag.includes('+')) fail(`étape ${id} : rôle requis pour une sous-étape de tag composé [${tag}]`);
    role = roleByTag[tag] ?? null;
    if (!role) warnings.push(`étape ${id} : tag [${tag}] sans rôle connu`);
  }
  const repoByRole = { simulator: 'simulator', station: 'xplor-station', bord: 'xplor-station', contract: 'xplor-contracts' };
  const complexity = raw.complexity ?? null;
  if (complexity !== null) oneOf(`complexity (étape ${id})`, complexity, COMPLEXITIES);
  return {
    id,
    parent,
    tag,
    role,
    kind,
    title,
    complexity,
    repo: raw.repo ?? repoByRole[tag.includes('+') ? role : tag] ?? 'project',
  };
}

function loadRun(root, flags) {
  let runId = flags.run === true ? undefined : flags.run;
  if (!runId) {
    const open = listRunIds(root).filter((id) => reduce(readEvents(root, id))?.run.status !== 'closed');
    // Sans run ouvert, le plus récent sert aux lectures et à la confirmation de `done`.
    if (open.length === 0) open.push(...listRunIds(root).slice(-1));
    if (open.length === 0) fail('aucun run dans ce checkout : lancer `init`');
    if (open.length > 1) fail(`plusieurs runs ouverts, préciser --run : ${open.join(', ')}`);
    [runId] = open;
  }
  const events = readEvents(root, runId);
  const state = reduce(events);
  if (!state) fail(`run illisible : ${runId}`);
  return { runId, events, state };
}

function requireStep(state, id) {
  if (id === undefined || id === true) fail('--step requis');
  const step = findStep(state, String(id));
  if (!step) fail(`étape inconnue : ${id} (connues : ${state.steps.map((s) => s.id).join(', ')})`);
  return step;
}

function buildInit(root, flags, now) {
  if (!flags.from || flags.from === true) fail('--from <fichier JSON> requis');
  const source = path.resolve(root, flags.from);
  let input;
  try {
    input = JSON.parse(fs.readFileSync(source, 'utf8').replace(/^﻿/, ''));
  } catch (error) {
    fail(`fichier d'initialisation illisible (${flags.from}) : ${error.message}`);
  }
  if (!input.plan) fail('champ `plan` requis');
  if (!Array.isArray(input.steps) || input.steps.length === 0) fail('champ `steps` requis (liste non vide)');
  const warnings = [];
  const plan = resolvePlan(root, input.plan);
  if (plan.duplicate) warnings.push('doublon mono + découpé : mono utilisé');
  const front = readFrontmatter(plan.file);
  if (!front.slug) fail(`frontmatter sans \`slug\` : ${plan.path}`);
  const steps = input.steps.map((raw) => normalizeStep(raw, warnings));
  const ids = new Set();
  for (const step of steps) {
    if (ids.has(step.id)) fail(`identifiant d'étape en double : ${step.id}`);
    ids.add(step.id);
  }
  for (const id of listRunIds(root)) {
    const other = reduce(readEvents(root, id));
    if (other && other.run.status !== 'closed' && other.plan.artifact === plan.artifact && !flags['force-new']) {
      fail(`un run est déjà ouvert pour ce plan : ${id} (statut ${other.run.status}). Le reprendre avec \`resume --run ${id}\`, ou forcer avec --force-new.`);
    }
  }
  const stamp = isoLocal(now).slice(0, 16).replace('T', '_').replace(':', '-');
  let runId = `${stamp}_exec_${front.slug}`;
  for (let suffix = 2; fs.existsSync(eventsFile(root, runId)); suffix += 1) {
    runId = `${stamp}_exec_${front.slug}-${suffix}`;
  }
  const repos = { project: describeRepo(root) };
  for (const [name, repoPath] of Object.entries(input.repos ?? {})) {
    if (name !== 'project') repos[name] = describeRepo(repoPath);
  }
  for (const step of steps) {
    if (!repos[step.repo]) warnings.push(`étape ${step.id} : dépôt « ${step.repo} » non déclaré dans \`repos\``);
  }
  const { path: checkoutRoot, ...checkout } = repos.project;
  const event = {
    type: 'run-started',
    orchestrator: input.orchestrator ?? 'execute-plan',
    profile: input.profile ?? null,
    isolation: input.isolation ?? 'none',
    gitea: Boolean(input.gitea),
    plan: {
      artifact: plan.artifact,
      path: plan.path,
      form: plan.form,
      slug: front.slug,
      title: front.title ?? null,
      kind: front.kind ?? null,
      status: front.status ?? null,
    },
    checkout: { root: checkoutRoot, ...checkout },
    repos,
    steps,
  };
  return { runId, event, warnings, cleanup: toPosix(source).includes(`/${STATE_DIR}/`) ? source : null };
}

// Chaque commande rend un événement prêt à être ajouté, ou lève une TrackerError.
function buildEvent(command, flags, state, root) {
  const warnings = [];
  const closed = state.run.status === 'closed';
  const afterClose = ['plan-status', 'note'];
  if (closed && !afterClose.includes(command)) {
    fail(`run clos (${state.run.outcome}) : commande ${command} refusée`);
  }

  switch (command) {
    case 'plan-status': {
      if (flags['done-declined']) return { event: { type: 'plan-done-declined' }, warnings };
      const to = oneOf('to', flags.to, ['executing', 'done']);
      const actual = readFrontmatter(path.join(root, state.plan.path)).status ?? null;
      if (actual !== to) {
        fail(`le frontmatter de ${state.plan.path} porte \`status: ${actual}\`, pas \`${to}\` : éditer le plan d'abord`);
      }
      if (to === 'done' && !closed) warnings.push('plan passé à done avant la clôture du run');
      return {
        event: { type: 'plan-status', from: state.plan.status, to, confirmedBy: to === 'done' ? 'user' : null },
        warnings,
      };
    }

    case 'launch': {
      const role = oneOf('role', flags.role, ROLES);
      const agent = text(flags.agent);
      if (!agent) fail('--agent requis (subagent_type lancé)');
      const event = { type: 'agent-started', role, agent };
      if (role === 'documenter') return { event, warnings };
      const mode = oneOf('mode', flags.mode, VERIFIER_MODES, { required: role === 'verifier' });
      if (role === 'verifier' && mode === 'final') return { event: { ...event, mode }, warnings };
      const step = requireStep(state, flags.step);
      if (TERMINAL.has(step.status)) fail(`étape ${step.id} déjà close (${step.status})`);
      event.step = step.id;
      event.repo = step.repo;
      if (role === 'implementer') {
        event.iteration = integer('iteration', flags.iteration) ?? step.iteration + 1;
        if (flags.tier && flags.tier !== true) event.tier = oneOf('tier', flags.tier, COMPLEXITIES);
        if (step.phase === 'implementing') warnings.push(`étape ${step.id} : implementer relancé sans rapport du précédent`);
      } else {
        event.mode = mode;
        event.iteration = step.iteration || 1;
        if (step.kind === 'agent' && step.phase !== 'implemented' && step.phase !== 'to-correct') {
          warnings.push(`étape ${step.id} : verifier lancé sans rapport implementer enregistré`);
        }
      }
      return { event, warnings };
    }

    case 'launch-failed': {
      const role = oneOf('role', flags.role, ROLES);
      const stepId = flags.step && flags.step !== true ? requireStep(state, flags.step).id : null;
      const active = state.agents.find((agent) => agent.role === role && agent.step === stepId);
      if (!active) warnings.push('échec de lancement sans lancement enregistré');
      const event = {
        type: 'agent-failed',
        role,
        agent: text(flags.agent) ?? active?.agent ?? null,
        error: text(flags.error) ?? 'erreur non précisée',
      };
      if (stepId) {
        event.step = stepId;
        event.iteration = active?.iteration ?? null;
      }
      return { event, warnings };
    }

    case 'report': {
      const role =
        flags.role && flags.role !== true
          ? oneOf('role', flags.role, ROLES)
          : flags.verdict
            ? 'verifier'
            : flags.journal
              ? 'documenter'
              : 'implementer';
      const event = { type: 'agent-report', role };
      const tokens = integer('tokens', flags.tokens);
      if (tokens !== null) event.tokens = tokens;
      const note = text(flags.note);
      if (note) event.note = note;
      if (role === 'documenter') {
        event.status = oneOf('status', flags.status, ['ok', 'error']);
        const journal = text(flags.journal);
        if (journal) event.journal = toPosix(journal);
        return { event, warnings };
      }
      if (role === 'verifier') {
        event.mode = oneOf('mode', flags.mode, VERIFIER_MODES);
        event.verdict = oneOf('verdict', flags.verdict, VERDICTS);
        event.recommendedAction =
          oneOf('action', flags.action, ACTIONS, { required: false }) ??
          (event.verdict === 'fail' ? 'fix-and-reverify' : 'merge');
        for (const key of ['blocking', 'notes']) {
          const value = integer(key, flags[key]);
          if (value !== null) event[key] = value;
        }
        if (event.mode === 'final') {
          if (state.finalGate.status !== 'running') warnings.push('rapport du gate final sans lancement enregistré');
          return { event, warnings };
        }
      } else {
        event.status = oneOf('status', flags.status, IMPLEMENTER_STATUS);
        if (flags.files && flags.files !== true) {
          event.files = String(flags.files)
            .split(',')
            .map((file) => toPosix(file.trim()))
            .filter(Boolean);
        }
      }
      const step = requireStep(state, flags.step);
      if (TERMINAL.has(step.status)) fail(`étape ${step.id} déjà close (${step.status})`);
      event.step = step.id;
      event.iteration = step.iteration || 1;
      const active = state.agents.find((agent) => agent.role === role && agent.step === step.id);
      if (active) event.agent = active.agent;
      else warnings.push(`rapport ${role} sans lancement enregistré (étape ${step.id})`);
      return { event, warnings };
    }

    case 'wait': {
      const reason = oneOf('reason', flags.reason, WAIT_REASONS);
      const event = { type: 'step-waiting', reason };
      const note = text(flags.note);
      if (note) event.note = note;
      if (flags.step && flags.step !== true) {
        const step = requireStep(state, flags.step);
        if (TERMINAL.has(step.status)) fail(`étape ${step.id} déjà close (${step.status})`);
        event.step = step.id;
      }
      return { event, warnings };
    }

    case 'resolve': {
      const action = oneOf('action', flags.action, RESOLVE_ACTIONS);
      const event = { type: 'user-resolved', action };
      const note = text(flags.note);
      if (note) event.note = note;
      const stepId = flags.step && flags.step !== true ? flags.step : state.run.wait?.step;
      if (stepId) {
        const step = requireStep(state, stepId);
        if (TERMINAL.has(step.status)) fail(`étape ${step.id} déjà close (${step.status})`);
        event.step = step.id;
      } else if (action === 'done' || action === 'skip') {
        fail(`--step requis pour l'action ${action}`);
      }
      if (state.run.status !== 'waiting-user') warnings.push("résolution sans attente utilisateur enregistrée");
      return { event, warnings };
    }

    case 'close-step': {
      const step = requireStep(state, flags.step);
      if (TERMINAL.has(step.status)) fail(`étape ${step.id} déjà close (${step.status})`);
      const outcome = oneOf('outcome', flags.outcome, STEP_OUTCOMES);
      const event = { type: 'step-closed', step: step.id, outcome };
      if (outcome === 'done') {
        const fallback = step.kind === 'decision' || step.kind === 'manual' ? step.kind : 'user';
        event.by = oneOf('by', flags.by, DONE_BY, { required: false }) ?? fallback;
        if (event.by === 'verifier') fail('une validation par le verifier passe par `report --verdict`, pas par close-step');
      }
      const note = text(flags.note);
      if (note) event.note = note;
      return { event, warnings };
    }

    case 'add-step': {
      const def = normalizeStep(
        {
          id: flags.id,
          tag: flags.tag,
          title: flags.title,
          parent: flags.parent === true ? undefined : flags.parent,
          role: flags.role === true ? undefined : flags.role,
          kind: flags.kind === true ? undefined : flags.kind,
          complexity: flags.complexity === true ? undefined : flags.complexity,
          repo: flags.repo === true ? undefined : flags.repo,
        },
        warnings,
      );
      if (findStep(state, def.id)) fail(`identifiant d'étape déjà utilisé : ${def.id}`);
      const event = { type: 'step-added', def };
      if (flags.after && flags.after !== true) event.afterStep = String(flags.after);
      return { event, warnings };
    }

    case 'profile': {
      const to = text(flags.to);
      if (!to) fail('--to requis');
      const event = { type: 'profile-changed', from: state.run.profile, to };
      const reason = text(flags.reason);
      if (reason) event.reason = reason;
      return { event, warnings };
    }

    case 'interrupt': {
      const event = { type: 'run-interrupted', reason: text(flags.reason) ?? 'non précisée' };
      const note = text(flags.note);
      if (note) event.note = note;
      return { event, warnings };
    }

    case 'resume': {
      const head = git(root, ['rev-parse', 'HEAD']);
      const baseline = state.checkout.baseline;
      if (head && baseline && git(root, ['merge-base', '--is-ancestor', baseline, head]) === null) {
        // `git merge-base --is-ancestor` sort en 1 sans sortie : null ici veut dire « non ancêtre ».
        warnings.push(`HEAD ${head.slice(0, 7)} ne descend pas du commit de départ ${baseline.slice(0, 7)}`);
      }
      return {
        event: {
          type: 'run-resumed',
          session: state.run.session + 1,
          unclean: state.run.status !== 'interrupted',
          head,
        },
        warnings,
      };
    }

    case 'close': {
      const outcome = oneOf('outcome', flags.outcome, RUN_OUTCOMES);
      const event = { type: 'run-closed', outcome };
      const journal = text(flags.journal);
      if (journal) event.journal = toPosix(journal);
      const open = state.steps.filter((step) => !TERMINAL.has(step.status)).map((step) => step.id);
      if (outcome === 'completed' && open.length > 0) {
        fail(`clôture \`completed\` refusée : étapes non closes ${open.join(', ')}. Les clore (close-step) ou clôturer en escalated / aborted.`);
      }
      return { event, warnings };
    }

    case 'note': {
      const value = text(flags.text);
      if (!value) fail('--text requis');
      const event = { type: 'note', text: value };
      if (flags.step && flags.step !== true) event.step = requireStep(state, flags.step).id;
      return { event, warnings };
    }

    default:
      return fail(`commande inconnue : ${command}`);
  }
}

function append(root, runId, event, warnings, now) {
  return withLock(root, runId, () => {
    const file = eventsFile(root, runId);
    const events = fs.existsSync(file) ? readEvents(root, runId) : [];
    const { type, ...data } = event;
    const full = { v: 1, seq: events.length + 1, at: isoLocal(now), run: runId, type, ...data };
    const state = applyEvent(reduce(events), full);
    full.after = { run: state.run.status };
    if (full.step) full.after.step = findStep(state, full.step).status;
    if (warnings.length > 0) full.warnings = warnings;
    fs.appendFileSync(file, `${JSON.stringify(full)}\n`);
    writeSnapshot(root, state);
    return { event: full, state };
  });
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

const MARKS = {
  pending: '[ ]',
  'in-progress': '[>]',
  'waiting-user': '[?]',
  done: '[x]',
  skipped: '[-]',
  escalated: '[!]',
};

export function formatStatus(state) {
  const { run, plan, progress } = state;
  const lines = [
    `Run ${state.runId} — ${run.status}${run.outcome ? ` (${run.outcome})` : ''} — session ${run.session} — profil ${run.profile ?? '?'}`,
    `Plan ${plan.artifact} (${plan.form}) — status ${plan.status}${plan.doneConfirmation ? ` — done ${plan.doneConfirmation}` : ''}`,
    `Avancement ${progress.done}/${progress.total} faites · ${progress.skipped} ignorées · ${progress.escalated} escaladées · en cours : ${progress.current ?? '—'} · suivante : ${progress.next ?? '—'}`,
  ];
  if (run.wait) {
    lines.push(`Attente utilisateur : ${run.wait.reason}${run.wait.step ? ` (étape ${run.wait.step})` : ''}${run.wait.note ? ` — ${run.wait.note}` : ''}`);
  }
  if (run.interruption) lines.push(`Interrompu : ${run.interruption.reason}${run.interruption.note ? ` — ${run.interruption.note}` : ''}`);
  for (const agent of state.agents) {
    lines.push(`Agent en cours : ${agent.role} ${agent.agent}${agent.step ? ` — étape ${agent.step}` : ''}${agent.mode ? ` (${agent.mode})` : ''} depuis ${agent.since}`);
  }
  for (const step of state.steps) {
    const detail = [];
    if (step.phase) detail.push(step.phase);
    const rounds = step.iterations.filter((it) => it.attempt === step.attempt).length;
    if (rounds > 0) detail.push(`${rounds} it.`);
    if (step.finalVerdict) detail.push(step.finalVerdict);
    else if (step.doneBy) detail.push(`par ${step.doneBy}`);
    if (step.wait) detail.push(`attente ${step.wait.reason}`);
    if (step.repo !== 'project') detail.push(step.repo);
    lines.push(`  ${MARKS[step.status]} ${step.id} [${step.tag}] ${step.title}${detail.length ? ` — ${detail.join(', ')}` : ''}`);
  }
  lines.push(`Gate final : ${state.finalGate.status} · Journal : ${state.journal.status}${state.journal.path ? ` (${state.journal.path})` : ''}`);
  return lines.join('\n');
}

const USAGE = `Suivi d'exécution des plans — node tools/history/run-tracker.mjs <commande> [options]

  init --from <fichier.json>            ouvre un run (plan, profil, étapes)
  plan-status --to executing|done       consigne le statut du frontmatter (vérifié dans le fichier)
  plan-status --done-declined           l'utilisateur garde le plan en executing
  launch --role implementer|verifier|documenter --agent <subagent_type> [--step N] [--mode step|docs-config|final] [--tier …]
  launch-failed --role … [--step N] --error "…"
  report --step N --status success|partial|blocked [--files a,b] [--tokens n] [--note "…"]
  report --step N --mode step|docs-config --verdict pass|pass-with-notes|fail [--action …] [--blocking n] [--notes n]
  report --mode final --verdict …       gate final
  report --role documenter --status ok|error --journal <chemin>
  wait [--step N] --reason <raison> [--note "…"]
  resolve [--step N] --action continue|retry|done|skip|abort [--note "…"]
  close-step --step N --outcome done|skipped|escalated [--by decision|manual|user] [--note "…"]
  add-step --id N --tag <tag> --title "…" [--after N] [--parent N] [--role …] [--kind …]
  profile --to <profil> [--reason "…"]
  interrupt --reason "…"   ·   resume   ·   close --outcome completed|escalated|aborted [--journal <chemin>]
  note --text "…" [--step N]
  status [--json]   ·   list [--json]   ·   rebuild

Options communes : --run <runId> (facultatif s'il n'y a qu'un run ouvert), --root <checkout>.`;

export function run(argv, options = {}) {
  const out = [];
  try {
    const [command, ...rest] = argv;
    if (!command || command === 'help' || command === '--help') return { code: 0, output: USAGE };
    const flags = parseArgs(rest);
    const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    const root = path.resolve(
      options.root ?? (flags.root && flags.root !== true ? flags.root : (process.env.WORKFLOW_REPO_ROOT ?? here)),
    );
    const now = options.now ? options.now() : new Date();

    if (command === 'list') {
      const runs = listRunIds(root).map((id) => reduce(readEvents(root, id))).filter(Boolean);
      if (flags.json) {
        return {
          code: 0,
          output: JSON.stringify(
            runs.map((state) => ({
              runId: state.runId,
              status: state.run.status,
              outcome: state.run.outcome,
              plan: state.plan.artifact,
              planStatus: state.plan.status,
              progress: state.progress,
              updatedAt: state.updatedAt,
            })),
          ),
        };
      }
      if (runs.length === 0) return { code: 0, output: 'aucun run enregistré dans ce checkout' };
      return {
        code: 0,
        output: runs
          .map((state) => `${state.runId} — ${state.run.status}${state.run.outcome ? ` (${state.run.outcome})` : ''} — ${state.progress.done}/${state.progress.total} — plan ${state.plan.status} — maj ${state.updatedAt}`)
          .join('\n'),
      };
    }

    if (command === 'init') {
      fs.mkdirSync(stateDir(root), { recursive: true });
      const { runId, event, warnings, cleanup } = buildInit(root, flags, now);
      const { state } = append(root, runId, event, warnings, now);
      if (cleanup) fs.rmSync(cleanup, { force: true });
      out.push(`ok run ${runId} — ${state.progress.total} étapes — plan ${state.plan.artifact} (${state.plan.form})`);
      for (const warning of warnings) out.push(`warn: ${warning}`);
      return { code: 0, output: out.join('\n'), runId };
    }

    const { runId, events, state } = loadRun(root, flags);
    if (command === 'status') {
      return { code: 0, output: flags.json ? JSON.stringify(state) : formatStatus(state) };
    }
    if (command === 'rebuild') {
      withLock(root, runId, () => writeSnapshot(root, state));
      return { code: 0, output: `ok instantané reconstruit depuis ${events.length} événements` };
    }

    const { event, warnings } = buildEvent(command, flags, state, root);
    const written = append(root, runId, event, warnings, now);
    const stepId = written.event.step;
    const step = stepId ? findStep(written.state, stepId) : null;
    out.push(
      `ok #${written.event.seq} ${written.event.type} — run ${written.state.run.status}` +
        (step ? ` — étape ${step.id} ${step.status}${step.phase ? `/${step.phase}` : ''}${step.iteration ? ` it.${step.iteration}` : ''}` : '') +
        ` — ${written.state.progress.done}/${written.state.progress.total}`,
    );
    for (const warning of warnings) out.push(`warn: ${warning}`);
    return { code: 0, output: out.join('\n'), runId };
  } catch (error) {
    if (error instanceof TrackerError) return { code: 2, output: `erreur: ${error.message}` };
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = run(process.argv.slice(2));
  (result.code === 0 ? console.log : console.error)(result.output);
  process.exitCode = result.code;
}
