// Tests du suivi d'exécution des plans (transitions, garde-fous, reprise).
// Lancer : node --test "tools/history/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { readEvents, reduce, run, STATE_DIR } from './run-tracker.mjs';

const PLAN = 'documentation/history/tasks/2026-10-07_09-00_task_suivi-demo.md';

function frontmatter(status, slug = 'suivi-demo') {
  return `---\ntype: planning-artifact\nkind: task\nstatus: ${status}\ntitle: "Plan de démonstration du suivi"\nslug: "${slug}"\n---\n\n# Plan\n`;
}

const STEPS = [
  { id: '1', tag: 'backend', title: 'Service de suivi', complexity: 'standard' },
  { id: '2.a', tag: 'backend+frontend', role: 'backend', title: 'Canal socket', complexity: 'complexe' },
  { id: '2.b', tag: 'backend+frontend', role: 'frontend', title: 'Canal socket', complexity: 'complexe' },
  { id: '3', tag: 'decision', title: 'Choix du format' },
  { id: '4', tag: 'docs', title: 'Documentation', complexity: 'simple' },
];

// Bac à sable : un faux checkout avec un plan, une horloge qui avance d'une minute par appel.
function sandbox({ planPath = PLAN, status = 'ready-to-execute', steps = STEPS, extra = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-suivi-'));
  const planFile = path.join(root, planPath);
  fs.mkdirSync(path.dirname(planFile), { recursive: true });
  fs.writeFileSync(planFile, frontmatter(status));
  let tick = 0;
  const now = () => new Date(2026, 9, 7, 10, tick++, 0);
  const call = (line) => run(line, { root, now });
  const ok = (...line) => {
    const result = call(line);
    assert.equal(result.code, 0, result.output);
    return result;
  };
  const init = (payload = {}) => {
    fs.mkdirSync(path.join(root, STATE_DIR), { recursive: true });
    const file = path.join(root, STATE_DIR, 'init-test.json');
    fs.writeFileSync(file, JSON.stringify({ plan: planPath, profile: 'auto', steps, ...extra, ...payload }));
    return call(['init', '--from', file]);
  };
  const state = () => JSON.parse(call(['status', '--json']).output);
  const setPlanStatus = (value) => fs.writeFileSync(planFile, frontmatter(value));
  return { root, call, ok, init, state, setPlanStatus, planFile };
}

function step(state, id) {
  return state.steps.find((item) => item.id === id);
}

// Boucle nominale d'une étape : implementer puis verifier.
function passStep(box, id, verdict = 'pass') {
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer-opus-5-5-medium', '--step', id);
  box.ok('report', '--step', id, '--status', 'success', '--files', 'backend/services/a.js,backend/test/a.test.js');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-5-5', '--step', id, '--mode', 'step');
  box.ok('report', '--step', id, '--mode', 'step', '--verdict', verdict);
}

test('init lit le plan, nomme le run comme le journal et supprime le fichier d’entrée', () => {
  const box = sandbox();
  const result = box.init();
  assert.equal(result.code, 0, result.output);
  assert.equal(result.runId, '2026-10-07_10-00_exec_suivi-demo');
  assert.ok(!fs.existsSync(path.join(box.root, STATE_DIR, 'init-test.json')));
  const state = box.state();
  assert.equal(state.schema, 'workflow-run-state/1');
  assert.equal(state.plan.artifact, 'tasks/2026-10-07_09-00_task_suivi-demo.md');
  assert.equal(state.plan.form, 'mono');
  assert.equal(state.plan.status, 'ready-to-execute');
  assert.equal(state.run.status, 'running');
  // 5 lignes d'exécution, mais 4 étapes de plan : 2.a et 2.b forment l'étape 2.
  assert.equal(state.steps.length, 5);
  assert.equal(state.progress.total, 4);
  assert.deepEqual(state.composites, [{ id: '2', children: ['2.a', '2.b'], status: 'pending' }]);
  assert.equal(step(state, '3').kind, 'decision');
  assert.equal(step(state, '4').role, 'backend');
});

test('le statut du plan n’est consigné que s’il est réellement dans le frontmatter', () => {
  const box = sandbox();
  box.init();
  const refused = box.call(['plan-status', '--to', 'executing']);
  assert.equal(refused.code, 2);
  assert.match(refused.output, /status: ready-to-execute/);
  assert.equal(readEvents(box.root, refused.runId ?? '2026-10-07_10-00_exec_suivi-demo').length, 1);
  box.setPlanStatus('executing');
  box.ok('plan-status', '--to', 'executing');
  assert.equal(box.state().plan.status, 'executing');
});

test('parcours nominal : statut du plan, rapports d’agents et verdicts restent distincts', () => {
  const box = sandbox();
  box.init();
  box.setPlanStatus('executing');
  box.ok('plan-status', '--to', 'executing');

  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer-opus-5-5-medium', '--step', '1', '--tier', 'standard');
  let state = box.state();
  assert.equal(step(state, '1').phase, 'implementing');
  assert.deepEqual(state.agents.map((agent) => [agent.role, agent.step, agent.iteration]), [['implementer', '1', 1]]);

  box.ok('report', '--step', '1', '--status', 'success', '--files', 'backend/services/a.js', '--tokens', '41000');
  state = box.state();
  // Un `success` d'implementer ne valide rien : l'étape attend son verifier.
  assert.equal(step(state, '1').status, 'in-progress');
  assert.equal(step(state, '1').phase, 'implemented');
  assert.equal(state.progress.done, 0);
  assert.equal(state.agents.length, 0);

  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-5-5', '--step', '1', '--mode', 'step');
  box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'pass-with-notes', '--notes', '2');
  state = box.state();
  assert.equal(step(state, '1').status, 'done');
  assert.equal(step(state, '1').doneBy, 'verifier');
  assert.equal(step(state, '1').finalVerdict, 'pass-with-notes');
  assert.equal(step(state, '1').iterations[0].implementer.status, 'success');
  assert.equal(step(state, '1').iterations[0].implementer.tokens, 41000);
  assert.equal(state.plan.status, 'executing');

  // Étape composite : validée seulement quand ses deux sous-étapes le sont.
  passStep(box, '2.a');
  state = box.state();
  assert.equal(state.composites[0].status, 'in-progress');
  assert.equal(state.progress.done, 1);
  passStep(box, '2.b');
  assert.equal(box.state().progress.done, 2);

  // Étape de décision : attente utilisateur, puis décision consignée, sans verdict de verifier.
  box.ok('wait', '--step', '3', '--reason', 'decision', '--note', 'JSONL ou SQLite ?');
  state = box.state();
  assert.equal(state.run.status, 'waiting-user');
  assert.equal(state.run.wait.step, '3');
  box.ok('resolve', '--action', 'done', '--note', 'JSONL retenu');
  state = box.state();
  assert.equal(state.run.status, 'running');
  assert.equal(step(state, '3').doneBy, 'decision');
  assert.equal(step(state, '3').finalVerdict, null);

  box.ok('close-step', '--step', '4', '--outcome', 'skipped', '--note', 'reportée');
  state = box.state();
  assert.deepEqual(
    [state.progress.done, state.progress.skipped, state.progress.current, state.progress.next],
    [3, 1, null, null],
  );

  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-5-5', '--mode', 'final');
  assert.equal(box.state().finalGate.status, 'running');
  box.ok('report', '--mode', 'final', '--verdict', 'pass');
  box.ok('launch', '--role', 'documenter', '--agent', 'documenter');
  box.ok('report', '--role', 'documenter', '--status', 'ok', '--journal', 'documentation/history/executions/2026-10-07_10-00_exec_suivi-demo.md');
  box.ok('close', '--outcome', 'completed');
  state = box.state();
  assert.equal(state.run.status, 'closed');
  assert.equal(state.run.outcome, 'completed');
  assert.equal(state.finalGate.status, 'pass');
  assert.equal(state.journal.status, 'written');
  // La clôture du run ne passe pas le plan à done : il faut la confirmation utilisateur.
  assert.equal(state.plan.status, 'executing');
  assert.equal(state.plan.doneConfirmation, null);

  assert.equal(box.call(['plan-status', '--to', 'done']).code, 2);
  box.setPlanStatus('done');
  box.ok('plan-status', '--to', 'done');
  state = box.state();
  assert.equal(state.plan.status, 'done');
  assert.equal(state.plan.doneConfirmation, 'confirmed');
  // Un run clos n'accepte plus de transition d'exécution.
  assert.equal(box.call(['launch', '--role', 'documenter', '--agent', 'documenter']).code, 2);
});

test('refus du passage à done : le plan reste executing', () => {
  const box = sandbox({ status: 'executing', steps: [STEPS[0]] });
  box.init();
  passStep(box, '1');
  box.ok('close', '--outcome', 'completed');
  box.ok('plan-status', '--done-declined');
  const state = box.state();
  assert.equal(state.plan.status, 'executing');
  assert.equal(state.plan.doneConfirmation, 'declined');
});

test('échec de lancement : attente utilisateur, dégradation du profil, relance en itération 1', () => {
  const box = sandbox();
  box.init();
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer-opus-5-5-medium', '--step', '1');
  box.ok('launch-failed', '--role', 'implementer', '--step', '1', '--error', 'model not available: claude-opus-5-5');
  let state = box.state();
  assert.equal(state.run.status, 'waiting-user');
  assert.equal(state.run.wait.reason, 'launch-failure');
  assert.equal(step(state, '1').status, 'waiting-user');
  assert.equal(step(state, '1').iterations[0].implementer.status, 'launch-failed');
  assert.equal(state.agents.length, 0);
  assert.equal(state.progress.done, 0);

  box.ok('profile', '--to', 'opus-4-8', '--reason', 'Opus 5.5 refusé au dispatch');
  box.ok('resolve', '--step', '1', '--action', 'retry', '--note', 'dégrader le modèle');
  state = box.state();
  assert.equal(state.run.profile, 'opus-4-8');
  assert.equal(state.run.status, 'running');
  assert.equal(step(state, '1').attempt, 2);

  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer-opus-4-8', '--step', '1');
  state = box.state();
  assert.equal(step(state, '1').iteration, 1);
  assert.deepEqual(step(state, '1').iterations.map((it) => [it.attempt, it.n]), [[1, 1], [2, 1]]);
  box.ok('report', '--step', '1', '--status', 'success');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-4-8', '--step', '1', '--mode', 'step');
  box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'pass');
  assert.equal(step(box.state(), '1').finalVerdict, 'pass');
});

test('échec de lancement du gate final : attente sans étape, puis interruption', () => {
  const box = sandbox({ steps: [STEPS[0]] });
  box.init();
  passStep(box, '1');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-5-5', '--mode', 'final');
  box.ok('launch-failed', '--role', 'verifier', '--error', 'dispatch refusé');
  let state = box.state();
  assert.equal(state.finalGate.status, 'launch-failed');
  assert.deepEqual([state.run.status, state.run.wait.step, state.run.wait.reason], ['waiting-user', null, 'launch-failure']);
  box.ok('interrupt', '--reason', 'model-refused', '--note', 'mettre à jour Claude Code');
  state = box.state();
  assert.equal(state.run.status, 'interrupted');
  assert.equal(step(state, '1').status, 'done');
});

test('validation après correction : fail, itération 2, pass', () => {
  const box = sandbox();
  box.init();
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer-sonnet-5-5', '--step', '1', '--tier', 'simple');
  box.ok('report', '--step', '1', '--status', 'success');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-5-5', '--step', '1', '--mode', 'step');
  box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'fail', '--action', 'fix-and-reverify', '--blocking', '2', '--note', 'test rouge');
  let state = box.state();
  // Un `fail` n'est pas une escalade : l'étape reste en cours, à corriger.
  assert.equal(step(state, '1').status, 'in-progress');
  assert.equal(step(state, '1').phase, 'to-correct');
  assert.equal(state.run.status, 'running');
  assert.equal(state.progress.done, 0);

  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer-opus-5-5-medium', '--step', '1', '--tier', 'standard');
  assert.equal(step(box.state(), '1').iteration, 2);
  box.ok('report', '--step', '1', '--status', 'success');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier-opus-5-5', '--step', '1', '--mode', 'step');
  box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'pass');
  state = box.state();
  const done = step(state, '1');
  assert.equal(done.status, 'done');
  assert.equal(done.finalVerdict, 'pass');
  assert.deepEqual(done.iterations.map((it) => [it.n, it.tier, it.verifier.verdict]), [[1, 'simple', 'fail'], [2, 'standard', 'pass']]);
  assert.equal(state.progress.done, 1);
});

test('verifier relancé sans nouvelle itération (détour d’environnement)', () => {
  const box = sandbox();
  box.init();
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '1');
  box.ok('report', '--step', '1', '--status', 'success');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier', '--step', '1', '--mode', 'step');
  box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'fail', '--note', 'environnement : npm install requis');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier', '--step', '1', '--mode', 'step');
  box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'pass');
  const done = step(box.state(), '1');
  assert.equal(done.iterations.length, 1);
  assert.equal(done.iterations[0].verifier.runs, 2);
  assert.equal(done.finalVerdict, 'pass');
});

test('troisième échec : escalade, puis étape ignorée ou abandonnée sur décision utilisateur', () => {
  const box = sandbox({ steps: [STEPS[0], STEPS[4]] });
  box.init();
  for (let iteration = 1; iteration <= 3; iteration += 1) {
    box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '1');
    box.ok('report', '--step', '1', '--status', iteration === 3 ? 'partial' : 'success');
    box.ok('launch', '--role', 'verifier', '--agent', 'verifier', '--step', '1', '--mode', 'step');
    box.ok('report', '--step', '1', '--mode', 'step', '--verdict', 'fail', '--action', iteration === 3 ? 'escalate-to-user' : 'fix-and-reverify');
  }
  let state = box.state();
  assert.equal(step(state, '1').iteration, 3);
  assert.equal(step(state, '1').status, 'waiting-user');
  assert.equal(state.run.wait.reason, 'escalation');

  box.ok('resolve', '--action', 'abort', '--note', 'abandon du plan');
  state = box.state();
  assert.equal(step(state, '1').status, 'escalated');
  assert.equal(step(state, '1').finalVerdict, 'fail-escalated');
  assert.equal(state.progress.escalated, 1);
  // Clôture `completed` impossible tant qu'une étape reste ouverte.
  assert.equal(box.call(['close', '--outcome', 'completed']).code, 2);
  box.ok('close', '--outcome', 'aborted');
  assert.equal(box.state().run.outcome, 'aborted');
});

test('implementer bloqué : attente utilisateur, puis reprise de la même étape', () => {
  const box = sandbox();
  box.init();
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '1');
  box.ok('report', '--step', '1', '--status', 'blocked', '--note', 'dépendance manquante');
  let state = box.state();
  assert.equal(state.run.wait.reason, 'implementer-blocked');
  assert.equal(step(state, '1').status, 'waiting-user');
  box.ok('resolve', '--action', 'continue', '--note', 'dépendance autorisée');
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '1');
  state = box.state();
  assert.equal(step(state, '1').iteration, 2);
  assert.equal(state.run.status, 'running');
});

test('interruption puis reprise : les étapes closes sont gardées, l’étape en cours repart en itération 1', () => {
  const box = sandbox();
  const { runId } = box.init();
  passStep(box, '1');
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '2.a');
  box.ok('report', '--step', '2.a', '--status', 'success');
  box.ok('launch', '--role', 'verifier', '--agent', 'verifier', '--step', '2.a', '--mode', 'step');
  box.ok('interrupt', '--reason', 'user-stop', '--note', 'fin de journée');
  let state = box.state();
  assert.equal(state.run.status, 'interrupted');
  assert.equal(state.agents.length, 0);
  // L'instantané montre où l'exécution s'est arrêtée.
  assert.equal(step(state, '2.a').phase, 'verifying');

  // Une nouvelle session ne peut pas ouvrir un second run sur le même plan.
  const second = box.init();
  assert.equal(second.code, 2);
  assert.match(second.output, new RegExp(`resume --run ${runId}`));

  box.ok('resume');
  state = box.state();
  assert.equal(state.run.status, 'running');
  assert.equal(state.run.session, 2);
  assert.equal(step(state, '1').status, 'done');
  assert.deepEqual([step(state, '2.a').status, step(state, '2.a').iteration, step(state, '2.a').attempt], ['pending', 0, 2]);
  assert.equal(state.progress.next, '2.a');
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '2.a');
  assert.equal(step(box.state(), '2.a').iteration, 1);
  assert.equal(readEvents(box.root, runId).at(-2).unclean, false);
});

test('reprise après un arrêt non signalé (session perdue pendant un agent)', () => {
  const box = sandbox();
  box.init();
  box.ok('launch', '--role', 'implementer', '--agent', 'backend-implementer', '--step', '1');
  // Aucun `interrupt` : la session a disparu. L'état reste `running`, daté.
  assert.equal(box.state().run.status, 'running');
  const resumed = box.ok('resume');
  const events = readEvents(box.root, resumed.runId);
  assert.equal(events.at(-1).unclean, true);
  const state = box.state();
  assert.equal(state.run.session, 2);
  assert.equal(state.agents.length, 0);
  assert.equal(step(state, '1').status, 'pending');
});

test('les tags ne fixent pas le dépôt et une cible explicite conserve sa clé', () => {
  const box = sandbox({
    steps: [
      { id: '1', tag: 'station', title: 'Service local' },
      { id: '2', tag: 'contract', title: 'Contrat local' },
      { id: '3', tag: 'bord', kind: 'manual', title: 'Contrôle manuel' },
      { id: '4', tag: 'simulator', title: 'Scénario local' },
      { id: '5', tag: 'station', repo: 'payments-adapter', title: 'Adaptateur externe' },
    ],
    extra: { repos: { 'payments-adapter': 'C:/work/payments-adapter' } },
  });
  const result = box.init();
  assert.equal(result.code, 0, result.output);
  assert.doesNotMatch(result.output, /non déclaré/);
  assert.deepEqual(box.state().steps.map((item) => item.repo), [
    'project', 'project', 'project', 'project', 'payments-adapter',
  ]);
  assert.deepEqual(Object.keys(box.state().repos), ['project', 'payments-adapter']);
});

test('plan découpé, doublon mono + dossier et plan multi-dépôts', () => {
  const sharded = 'documentation/history/tasks/2026-10-07_09-00_task_suivi-demo/index.md';
  const box = sandbox({
    planPath: sharded,
    steps: [
      { id: '1', tag: 'contract', repo: 'xplor-contracts', title: 'Schéma du message' },
      { id: '2', tag: 'station', repo: 'xplor-station', title: 'Passerelle' },
      { id: '3', tag: 'bord', repo: 'xplor-station', kind: 'manual', title: 'Câblage du banc' },
      { id: '4', tag: 'simulator', repo: 'simulator', title: 'Scénario' },
      { id: '5', tag: 'frontend', title: 'Panneau' },
    ],
    extra: { repos: { 'xplor-station': 'C:/DEV/xplor-station', 'xplor-contracts': 'C:/DEV/xplor-contracts' } },
  });
  // Le chemin « mono » donné à execute-plan se résout vers le dossier découpé.
  const result = box.init({ plan: 'documentation/history/tasks/2026-10-07_09-00_task_suivi-demo.md' });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /dépôt « simulator » non déclaré/);
  let state = box.state();
  assert.equal(state.plan.form, 'sharded');
  assert.equal(state.plan.artifact, 'tasks/2026-10-07_09-00_task_suivi-demo/index.md');
  assert.deepEqual(state.steps.map((item) => [item.id, item.role, item.repo, item.kind]), [
    ['1', 'station', 'xplor-contracts', 'agent'],
    ['2', 'station', 'xplor-station', 'agent'],
    ['3', null, 'xplor-station', 'manual'],
    ['4', 'backend', 'simulator', 'agent'],
    ['5', 'frontend', 'project', 'agent'],
  ]);
  assert.deepEqual(Object.keys(state.repos), ['project', 'xplor-station', 'xplor-contracts']);

  box.ok('wait', '--step', '3', '--reason', 'manual');
  box.ok('resolve', '--action', 'done', '--note', 'câblage fait, horloge filmée');
  assert.equal(step(box.state(), '3').doneBy, 'manual');
  box.ok('close', '--outcome', 'escalated');

  // Doublon : le mono l'emporte, avec avertissement.
  fs.writeFileSync(path.join(box.root, 'documentation/history/tasks/2026-10-07_09-00_task_suivi-demo.md'), frontmatter('plan'));
  const duplicate = box.init({ plan: 'documentation/history/tasks/2026-10-07_09-00_task_suivi-demo.md' });
  assert.equal(duplicate.code, 0, duplicate.output);
  assert.match(duplicate.output, /doublon/);
  state = JSON.parse(box.call(['status', '--json', '--run', duplicate.runId]).output);
  assert.equal(state.plan.form, 'mono');
});

test('étape ajoutée en cours d’exécution : placée après son ancre, comptée', () => {
  const box = sandbox();
  box.init();
  box.ok('add-step', '--id', '2b', '--tag', 'backend', '--title', 'Correctif de migration', '--after', '2');
  const state = box.state();
  assert.deepEqual(state.steps.map((item) => item.id), ['1', '2.a', '2.b', '2b', '3', '4']);
  assert.equal(state.progress.total, 5);
  assert.equal(box.call(['add-step', '--id', '2b', '--tag', 'backend', '--title', 'Doublon']).code, 2);
});

test('une commande refusée n’écrit rien', () => {
  const box = sandbox();
  const { runId } = box.init();
  const before = fs.readFileSync(path.join(box.root, STATE_DIR, `${runId}.events.jsonl`), 'utf8');
  for (const line of [
    ['launch', '--role', 'implementer', '--agent', 'x', '--step', '99'],
    ['report', '--step', '1', '--status', 'fini'],
    ['report', '--step', '1', '--mode', 'step', '--verdict', 'ok'],
    ['wait', '--step', '1', '--reason', 'café'],
    ['close-step', '--step', '1', '--outcome', 'done', '--by', 'verifier'],
    ['close', '--outcome', 'completed'],
    ['inconnue'],
  ]) {
    assert.equal(box.call(line).code, 2, line.join(' '));
  }
  assert.equal(fs.readFileSync(path.join(box.root, STATE_DIR, `${runId}.events.jsonl`), 'utf8'), before);
});

test('un rapport sans lancement est accepté avec avertissement', () => {
  const box = sandbox();
  box.init();
  const result = box.ok('report', '--step', '1', '--status', 'success');
  assert.match(result.output, /warn: rapport implementer sans lancement/);
  const events = readEvents(box.root, result.runId);
  assert.deepEqual(events.at(-1).warnings, ['rapport implementer sans lancement enregistré (étape 1)']);
  assert.equal(step(box.state(), '1').iterations.length, 1);
});

test('l’instantané est la réduction exacte des événements, et se reconstruit', () => {
  const box = sandbox();
  const { runId } = box.init();
  passStep(box, '1');
  box.ok('wait', '--step', '3', '--reason', 'decision');
  const file = path.join(box.root, STATE_DIR, `${runId}.state.json`);
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  const events = readEvents(box.root, runId);
  assert.deepEqual(snapshot, reduce(events));
  assert.deepEqual(events.map((event) => event.seq), events.map((_, index) => index + 1));
  assert.deepEqual(events.at(-1).after, { run: 'waiting-user', step: 'waiting-user' });

  // Ligne tronquée en fin de journal et instantané perdu : tout se reconstruit.
  fs.appendFileSync(path.join(box.root, STATE_DIR, `${runId}.events.jsonl`), '{"v":1,"seq":99,"type":"agent-st');
  fs.rmSync(file);
  box.ok('rebuild');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), snapshot);
});

test('status et list sont lisibles sans outil', () => {
  const box = sandbox();
  const { runId } = box.init();
  passStep(box, '1');
  box.ok('wait', '--step', '3', '--reason', 'decision', '--note', 'JSONL ou SQLite ?');
  const status = box.call(['status']).output;
  assert.match(status, /Avancement 1\/4 faites/);
  assert.match(status, /\[x\] 1 \[backend\] Service de suivi — 1 it\., pass/);
  assert.match(status, /\[\?\] 3 \[decision\] Choix du format — decision, attente decision/);
  assert.match(status, /Attente utilisateur : decision \(étape 3\) — JSONL ou SQLite \?/);
  assert.match(box.call(['list']).output, new RegExp(`^${runId} — waiting-user — 1/4`));
});

test('les exemples publiés restent cohérents avec le réducteur', () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'examples');
  const names = fs.readdirSync(dir).filter((name) => name.endsWith('.events.jsonl'));
  assert.ok(names.length >= 2);
  for (const name of names) {
    const events = fs
      .readFileSync(path.join(dir, name), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const snapshot = JSON.parse(fs.readFileSync(path.join(dir, name.replace('.events.jsonl', '.state.json')), 'utf8'));
    assert.deepEqual(reduce(events), snapshot, name);
  }
});
