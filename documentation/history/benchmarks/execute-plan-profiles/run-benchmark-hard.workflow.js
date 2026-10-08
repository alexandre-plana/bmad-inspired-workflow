// Benchmark V2 — TÂCHE DURE (CPA/TCPA). Même protocole que la V1, étalon plus
// exigeant (cf. hard/SPEC.md) censé discriminer la QUALITÉ entre profils.
// Session FRAÎCHE requise (registre avec *-opus-medium). Lancer via :
//   Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-hard.workflow.js' })

export const meta = {
  name: 'bench-execute-plan-profiles-hard',
  description: 'Benchmark V2 (tâche dure CPA/TCPA) — herite/medium/sonnet : temps, tokens, conformité',
  phases: [
    { title: 'Implement', detail: '3 profils x 3 runs, séquentiel, self-timed (fichier)' },
    { title: 'Score', detail: 'oracle caché + juge rubrique, en parallèle' },
  ],
}

const ROOT = 'documentation/history/benchmarks/execute-plan-profiles'
const BENCH = `${ROOT}/hard`
const RUBRIC = `${ROOT}/RUBRIC.md`
const RUNS = 3
const PROFILES = [
  { id: 'herite', agentType: 'backend-implementer', model: undefined },
  { id: 'medium', agentType: 'backend-implementer-opus-medium', model: undefined },
  { id: 'sonnet', agentType: 'backend-implementer', model: 'sonnet' },
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
    `Tâche de benchmark DURE — implémentation ISOLÉE. Profil "${p.id}", run ${run}/3.`,
    ``,
    `1. AVANT tout, via ton outil shell (Bash ou PowerShell — la commande node est neutre) :`,
    `   crée le dossier et stampe le départ dans un FICHIER (l'état shell ne persiste PAS entre appels) :`,
    `   \`node -e "const fs=require('fs');fs.mkdirSync('${dir}',{recursive:true});fs.writeFileSync('${dir}/.bench-start',String(Date.now()))"\``,
    `2. Lis INTÉGRALEMENT la spec figée : \`${BENCH}/SPEC.md\` (CPA/TCPA — attention aux`,
    `   conventions de signe, à la garde division-par-zéro, au TCPA négatif, au formatTcpa).`,
    `3. Implémente le module EXACTEMENT à : \`${dir}/cpa.mjs\` (ESM, exports nommés, zéro dépendance).`,
    `4. Écris TES tests \`node:test\` à : \`${dir}/cpa.test.mjs\`.`,
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
    `1. Copie l'oracle : \`node -e "require('fs').copyFileSync('${BENCH}/reference/cpa.reference.test.mjs','${dir}/__ref.test.mjs')"\`.`,
    `2. Exécute UNIQUEMENT l'oracle : \`node --test --test-reporter=tap "${dir}/__ref.test.mjs"\` (capture la sortie).`,
    `3. Vérifie la syntaxe : \`node --check "${dir}/cpa.mjs"\` (syntaxOk = exit 0).`,
    `4. Nettoie : \`node -e "require('fs').rmSync('${dir}/__ref.test.mjs')"\`.`,
    `Réponds en structuré : refPassed et refTotal (lignes "# pass" / "# tests" de node --test),`,
    `syntaxOk (booléen), detail (1 ligne : 1re erreur éventuelle — utile car l'oracle DOIT discriminer).`,
  ].join('\n')
}

function judgePrompt(dir) {
  return [
    `Juge de conformité/propreté. Lis \`${dir}/cpa.mjs\` ET \`${dir}/cpa.test.mjs\`,`,
    `puis applique INTÉGRALEMENT la grille \`${RUBRIC}\` (5 critères notés 0-2).`,
    `Tu ne sais pas quel profil a produit ce code. Ne réexécute pas les tests : juge la FORME`,
    `(en particulier la gestion de la garde |v|=0, du TCPA négatif, et des bornes de formatTcpa).`,
    `Réponds en structuré : c1..c5 (0-2 chacun), total (/10), justification (1 ligne par critère).`,
  ].join('\n')
}

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
  etalon: 'hard/cpa (CPA/TCPA)',
  profiles: PROFILES.map((p) => p.id),
  runsPerProfile: RUNS,
  results: results.filter(Boolean),
}
