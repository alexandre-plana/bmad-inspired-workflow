// Benchmark des 3 profils d'exécution (herite / medium / sonnet) sur l'étalon
// pur `geo-nav`. À lancer en SESSION FRAÎCHE (le registre des subagents doit
// contenir les variantes *-opus-medium / verifier-max) via :
//   Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark.workflow.js' })
//
// Métriques par run :
//   - temps    : auto-chrono de l'agent via FICHIER (l'état shell ne persiste
//                pas entre appels Bash) -> elapsedSeconds
//   - tokens   : delta budget.spent() (tokens output) autour de chaque agent
//   - correction: oracle CACHÉ (geo-nav.reference.test.mjs) -> refPassed/refTotal
//   - propreté : juge appliquant RUBRIC.md -> total /10

export const meta = {
  name: 'bench-execute-plan-profiles',
  description: 'Benchmark herite/medium/sonnet sur un module pur (temps, tokens, conformité)',
  phases: [
    { title: 'Implement', detail: '3 profils x 3 runs, séquentiel, self-timed (fichier)' },
    { title: 'Score', detail: 'oracle caché + juge rubrique, en parallèle' },
  ],
}

const BENCH = 'documentation/history/benchmarks/execute-plan-profiles'
const RUNS = 3
const PROFILES = [
  { id: 'herite', agentType: 'backend-implementer', model: undefined },             // inherit session
  { id: 'medium', agentType: 'backend-implementer-opus-medium', model: undefined }, // frontmatter opus-4-8 @ medium
  { id: 'sonnet', agentType: 'backend-implementer', model: 'sonnet' },              // base + tier sonnet
]

const IMPL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['elapsedSeconds', 'modulePath', 'testPath', 'nodeTestPassed', 'nodeTestTotal'],
  properties: {
    elapsedSeconds: { type: 'number' },
    modulePath: { type: 'string' },
    testPath: { type: 'string' },
    nodeTestPassed: { type: 'integer' },
    nodeTestTotal: { type: 'integer' },
    notes: { type: 'string' },
  },
}

const REF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['refPassed', 'refTotal', 'syntaxOk'],
  properties: {
    refPassed: { type: 'integer' },
    refTotal: { type: 'integer' },
    syntaxOk: { type: 'boolean' },
    detail: { type: 'string' },
  },
}

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['c1', 'c2', 'c3', 'c4', 'c5', 'total', 'justification'],
  properties: {
    c1: { type: 'integer' }, c2: { type: 'integer' }, c3: { type: 'integer' },
    c4: { type: 'integer' }, c5: { type: 'integer' }, total: { type: 'integer' },
    justification: { type: 'string' },
  },
}

function implPrompt(p, run) {
  const dir = `${BENCH}/work/${p.id}/run${run}`
  return [
    `Tâche de benchmark — implémentation ISOLÉE. Profil "${p.id}", run ${run}/3.`,
    ``,
    `1. AVANT tout, via ton outil shell (Bash ou PowerShell — la commande node est neutre) :`,
    `   crée le dossier et stampe le départ dans un FICHIER (l'état shell ne persiste PAS entre appels) :`,
    `   \`node -e "const fs=require('fs');fs.mkdirSync('${dir}',{recursive:true});fs.writeFileSync('${dir}/.bench-start',String(Date.now()))"\``,
    `2. Lis INTÉGRALEMENT la spec figée : \`${BENCH}/SPEC.md\`.`,
    `3. Implémente le module EXACTEMENT à : \`${dir}/geo-nav.mjs\` (ESM, exports nommés, zéro dépendance).`,
    `4. Écris TES tests \`node:test\` à : \`${dir}/geo-nav.test.mjs\`.`,
    `5. NE TOUCHE AUCUN fichier hors de \`${dir}/\`. Ne lance ni lint ni test à l'échelle du repo.`,
    `6. Auto-vérifie : \`node --test "${dir}/*.test.mjs"\` (motif de fichiers : sous Node 24, un dossier nu n'est plus accepté) ; corrige jusqu'au vert si possible.`,
    `7. Mesure ta durée en relisant le fichier de départ (même outil shell) :`,
    `   \`node -e "console.log(((Date.now()-Number(require('fs').readFileSync('${dir}/.bench-start','utf8')))/1000).toFixed(1))"\``,
    `   et reporte cette valeur (secondes) dans elapsedSeconds.`,
    ``,
    `Réponds via la sortie structurée : elapsedSeconds (nombre), modulePath, testPath,`,
    `nodeTestPassed / nodeTestTotal (résultats de TON \`node --test\`), notes (1 ligne).`,
  ].join('\n')
}

function refPrompt(dir) {
  return [
    `Scoring de correction (oracle caché). Tâche lecture/exécution, NE MODIFIE PAS le module testé.`,
    `1. Copie l'oracle dans le dossier du run : \`node -e "require('fs').copyFileSync('${BENCH}/reference/geo-nav.reference.test.mjs','${dir}/__ref.test.mjs')"\`.`,
    `2. Exécute UNIQUEMENT l'oracle : \`node --test --test-reporter=tap "${dir}/__ref.test.mjs"\` (capture la sortie).`,
    `3. Vérifie la syntaxe du module : \`node --check "${dir}/geo-nav.mjs"\` (syntaxOk = exit 0).`,
    `4. Nettoie : \`node -e "require('fs').rmSync('${dir}/__ref.test.mjs')"\`.`,
    `Réponds en structuré : refPassed et refTotal (lignes "# pass" / "# tests" de node --test),`,
    `syntaxOk (booléen), detail (1 ligne : 1re erreur éventuelle).`,
  ].join('\n')
}

function judgePrompt(dir) {
  return [
    `Juge de conformité/propreté. Lis \`${dir}/geo-nav.mjs\` ET \`${dir}/geo-nav.test.mjs\`,`,
    `puis applique INTÉGRALEMENT la grille \`${BENCH}/RUBRIC.md\` (5 critères notés 0-2).`,
    `Tu ne sais pas quel profil a produit ce code. Ne réexécute pas les tests (la correction`,
    `est mesurée ailleurs) : juge la FORME.`,
    `Réponds en structuré : c1..c5 (0-2 chacun), total (/10), justification (1 ligne par critère).`,
  ].join('\n')
}

// ---- Phase 1 : implémentation (séquentielle pour un chrono/tokens non contendus) ----
phase('Implement')
const impl = []
for (const p of PROFILES) {
  for (let run = 1; run <= RUNS; run++) {
    const before = budget.spent()
    const r = await agent(implPrompt(p, run), {
      agentType: p.agentType,
      model: p.model,
      label: `impl:${p.id}#${run}`,
      phase: 'Implement',
      schema: IMPL_SCHEMA,
    })
    impl.push({ profile: p.id, run, tokensOut: budget.spent() - before, impl: r })
    log(`${p.id}#${run} fait — ${r ? `${r.elapsedSeconds}s, node --test ${r.nodeTestPassed}/${r.nodeTestTotal}` : 'SKIP'}`)
  }
}

// ---- Phase 2 : scoring (parallèle : timing sans importance ici) ----
phase('Score')
const results = await parallel(impl.map((it) => () => {
  if (!it.impl) return Promise.resolve({ ...it, oracle: null, judge: null })
  const dir = `${BENCH}/work/${it.profile}/run${it.run}`
  return parallel([
    () => agent(refPrompt(dir), { label: `oracle:${it.profile}#${it.run}`, phase: 'Score', schema: REF_SCHEMA }),
    () => agent(judgePrompt(dir), { label: `judge:${it.profile}#${it.run}`, phase: 'Score', schema: JUDGE_SCHEMA }),
  ]).then(([oracle, judge]) => ({ ...it, oracle, judge }))
}))

return {
  profiles: PROFILES.map((p) => p.id),
  runsPerProfile: RUNS,
  results: results.filter(Boolean),
}
