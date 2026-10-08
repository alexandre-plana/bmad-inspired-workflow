// Benchmark V4 — Opus 5.5 (`opus-5-5`) contre le défaut mesuré `opus-4-8`
// (témoin rejoué dans la même session), sur la MÊME tâche dure que V2/V3
// (CPA/TCPA, cf. hard/SPEC.md) — chiffres comparables à RESULTS-v3.md.
//
// Différences avec run-benchmark-gen.workflow.js :
//   - PROFILES = opus-4-8 (témoin) + opus-5-5 ;
//   - runs ENTRELACÉS (4-8#1, 5-5#1, 4-8#2…) pour étaler la dérive de charge ;
//   - dossiers sous hard/work/v4/ (couvert par le .gitignore local) ;
//   - l'oracle caché n'est PAS rejoué par un agent : c'est une commande
//     déterministe (`node --test`), exécutée par la session après le run.
// Étalon, rubrique, schémas et consigne d'implémentation : identiques.
//
// Lancer via :
//   Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-v4.workflow.js' })

export const meta = {
  name: 'bench-execute-plan-profiles-v4',
  description: 'Benchmark V4 (tâche dure CPA/TCPA) — opus-5-5 vs témoin opus-4-8 : temps, tokens, conformité',
  phases: [
    { title: 'Implement', detail: '2 profils x 3 runs entrelacés, séquentiel, self-timed (fichier)' },
    { title: 'Judge', detail: 'juge rubrique aveugle, en parallèle' },
  ],
}

const ROOT = 'documentation/history/benchmarks/execute-plan-profiles'
const BENCH = `${ROOT}/hard`
const WORK = `${BENCH}/work/v4`
const RUBRIC = `${ROOT}/RUBRIC.md`
const RUNS = 3
const PROFILES = [
  { id: 'opus-4-8', agentType: 'backend-implementer-opus-4-8' },
  { id: 'opus-5-5', agentType: 'backend-implementer-opus-5-5' },
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
  const dir = `${WORK}/${p.id}/run${run}`
  return [
    `Tâche de benchmark DURE — implémentation ISOLÉE. Profil "${p.id}", run ${run}/${RUNS}.`,
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
for (let run = 1; run <= RUNS; run++) {
  for (const p of PROFILES) {
    const before = budget.spent()
    const r = await agent(implPrompt(p, run), {
      agentType: p.agentType,
      label: `impl:${p.id}#${run}`,
      phase: 'Implement',
      schema: IMPL_SCHEMA,
    })
    impl.push({ profile: p.id, run, tokensOut: budget.spent() - before, impl: r })
    log(`${p.id}#${run} fait — ${r ? `${r.elapsedSeconds}s, node --test ${r.nodeTestPassed}/${r.nodeTestTotal}` : 'SKIP (agent mort ou modèle indisponible)'}`)
  }
}

phase('Judge')
const results = await parallel(impl.map((it) => () => {
  if (!it.impl) return Promise.resolve({ ...it, judge: null })
  const dir = `${WORK}/${it.profile}/run${it.run}`
  return agent(judgePrompt(dir), { label: `judge:${it.profile}#${it.run}`, phase: 'Judge', schema: JUDGE_SCHEMA })
    .then((judge) => ({ ...it, dir, judge }))
}))

return {
  campaign: 'v4-opus-5-5',
  etalon: 'hard/cpa (CPA/TCPA)',
  profiles: PROFILES.map((p) => p.id),
  runsPerProfile: RUNS,
  results: results.filter(Boolean),
}
