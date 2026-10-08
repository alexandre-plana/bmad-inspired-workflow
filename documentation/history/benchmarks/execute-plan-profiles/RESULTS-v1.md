---
kind: benchmark-results
status: done
date: "2026-06-09"
title: "Benchmark V1 (tâche facile) — profils d'exécution herite / medium / sonnet"
relatedTask: "documentation/history/tasks/2026-06-08_13-41_task_execute-plan-model-effort-profiles.md"
etalon: "geo-nav (module pur, 4 fonctions nav/units)"
runsPerProfile: 3
agentsTotal: 27
workflowTokens: 710610
workflowDurationMin: 19.6
note: "Artefact de résultats — non indexé dans INDEX.md (ce n'est pas un artefact de planification)."
---

# Benchmark V1 — profils d'exécution sur tâche facile (`geo-nav`)

Comparatif des 3 profils introduits par
[`…_task_execute-plan-model-effort-profiles`](../../tasks/2026-06-08_13-41_task_execute-plan-model-effort-profiles.md),
sur une tâche-étalon **identique** (module pur `geo-nav` : `knotsToMetersPerMinute`,
`shortestBearingDeltaDeg`, `haversineNm`, `etaMinutes`).

Méthode, protocole et métriques : voir [`README.md`](./README.md), [`SPEC.md`](./SPEC.md),
[`RUBRIC.md`](./RUBRIC.md). Oracle de correction caché : `reference/geo-nav.reference.test.mjs`
(27 assertions). Routage : `herite`→`backend-implementer` (inherit Opus 4.8 @ xhigh) ·
`medium`→`backend-implementer-opus-medium` (Opus 4.8 @ medium) · `sonnet`→`backend-implementer`+`model:'sonnet'`.

## Résultats détaillés (9 runs)

| Profil | Run | Temps (s) | Tokens out¹ | Oracle² | Juge³ | Tests écrits | Note clé |
|---|---|---|---|---|---|---|---|
| herite | 1 | 67,6 | 8 336 | 27/27 | 10/10 | 15 | RAS |
| herite | 2 | 107,0 | 8 827 | 27/27 | 10/10 | 17 | a corrigé un `-0` sur `shortestBearingDeltaDeg(370,10)` |
| herite | 3 | 74,1 | 7 013 | 27/27 | 10/10 | 14 | RAS |
| medium | 1 | 60,1 | 4 898 | 27/27 | 10/10 | 12 | RAS |
| medium | 2 | 62,2 | 4 902 | 27/27 | 10/10 | 12 | RAS |
| medium | 3 | 47,3 | 4 602 | 27/27 | 10/10 | 11 | run le plus rapide & le moins cher |
| sonnet | 1 | 75,6 | 5 214 | 27/27 | 10/10 | 36 | RAS |
| sonnet | 2 | 72,9 | 4 891 | 27/27 | 10/10 | 35 | RAS |
| sonnet | 3 | 57,7 | 5 353 | 27/27 | 10/10 | 36 | RAS |

¹ tokens **output** (delta `budget.spent()`), implémenteur seul · ² oracle caché 27 assertions ·
³ juge rubrique /10 (C1–C5 = 2/2 sur les 9 runs).

## Agrégats (médiane, [min–max])

| Profil | Temps méd. (s) | Tokens out méd. | Correction | Propreté | Tests (méd.) |
|---|---|---|---|---|---|
| **herite** (Opus 4.8 @ xhigh) | 74,1 [67,6–107] | 8 336 [7,0k–8,8k] | 27/27 ×3 | 10/10 ×3 | 15 |
| **medium** (Opus 4.8 @ medium) | **60,1** [47,3–62,2] | **4 898** [4,6k–4,9k] | 27/27 ×3 | 10/10 ×3 | 12 |
| **sonnet** (Sonnet 4.6) | 72,9 [57,7–75,6] | 5 214 [4,9k–5,4k] | 27/27 ×3 | 10/10 ×3 | 36 |

**Normalisé (medium = 1.0)** — tokens : herite **1,70×**, sonnet **1,06×** · temps : herite **1,23×**, sonnet **1,21×**.

## Constats

1. **Qualité saturée** : 9/9 runs à 27/27 (oracle) + 10/10 (juge). Sur un module pur
   bien spécifié, les trois profils produisent du code **correct et propre, indiscernable
   en qualité**. Ce benchmark mesure donc le **coût/vitesse à qualité (parfaite) égale**.
2. **`medium` = meilleur rapport coût/vitesse** : le plus rapide **et** le moins cher,
   à qualité identique. Valide le choix de `medium` comme **profil par défaut**.
3. **`herite` (xhigh) le plus coûteux** : +70 % de tokens, +23 % de temps vs medium,
   **sans gain de qualité** ici — xhigh est surdimensionné pour une tâche facile.
4. **`sonnet` ≈ medium en coût**, mais écrit **~3× plus de tests** (36 vs 12) sans
   meilleure note (C5=2/2 partout) — plus verbeux côté tests, un poil plus lent.
5. **Variance** : herite la plus dispersée (un run à 107 s) ; medium la plus stable.

## Caveats

- **Étalon trop facile pour discriminer la qualité** : « tout en 10/10 » ne signifie pas
  « profils équivalents en général », seulement « équivalents sur une tâche simple où le
  moins cher gagne ». → motive la **V2 tâche dure** (`hard/`).
- `herite` = modèle/effort **de la session** (ici Opus 4.8 @ xhigh, `settings.json`).
- Tokens = **output uniquement** (delta budget), implémenteur seul ; le scoring est exclu.
- **Axe vérification non testé** (`verifier` vs `verifier-max`).
- n=3 → ordres de grandeur, pas vérité au token près.

## Environnement & coût

- Node **24.14** (quirk : `node --test <dossier>` traite l'argument comme module ; les
  implémenteurs ont ciblé le fichier `.test.mjs` ou un glob — sans impact sur l'oracle,
  source de vérité, qui reste à 27/27).
- Coût du benchmark lui-même : **710 610 tokens**, **~19,6 min** (27 agents : 9 implé. + 18 scoring).

## Reproductibilité

Session fraîche (registre chargé) en Opus 4.8, puis :

```
Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark.workflow.js' })
```
