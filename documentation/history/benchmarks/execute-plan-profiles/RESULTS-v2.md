---
kind: benchmark-results
status: done
date: "2026-06-09"
title: "Benchmark V2 (tâche dure CPA/TCPA) — profils herite / medium / sonnet"
relatedTask: "documentation/history/tasks/2026-06-08_13-41_task_execute-plan-model-effort-profiles.md"
relatedResults: "documentation/history/benchmarks/execute-plan-profiles/RESULTS-v1.md"
etalon: "hard/cpa (CPA/TCPA, cinématique relative)"
runsPerProfile: 3
agentsTotal: 27
workflowTokens: 771236
workflowDurationMin: 24.9
note: "Rapport de résultats — non indexé dans INDEX.md."
---

# Benchmark V2 — tâche dure (`cpa`, CPA/TCPA)

Suite de [`RESULTS-v1.md`](./RESULTS-v1.md). Étalon volontairement piégeux
([`hard/SPEC.md`](./hard/SPEC.md)) pour **discriminer la qualité** : garde
division-par-zéro (cap parallèle → `NaN`), convention de signe cog (sin/cos),
**TCPA négatif** (cible qui s'éloigne), conversions d'unités, `formatTcpa` à
bornes. Oracle caché : `hard/reference/cpa.reference.test.mjs` (16 assertions).

## Résultats détaillés (9 runs)

| Profil | Run | Temps (s) | Tokens out¹ | Oracle² | Juge³ | Tests écrits | Note clé |
|---|---|---|---|---|---|---|---|
| herite | 1 | 78,3 | 9 617 | 16/16 | 10/10 | 14 | RAS |
| herite | 2 | 104,8 | 10 244 | 16/16 | 10/10 | 16 | RAS |
| herite | 3 | 124,7 | 9 489 | 16/16 | 10/10 | 14 | RAS |
| medium | 1 | 115,4 | 9 708 | 16/16 | 10/10 | 14 | RAS |
| medium | 2 | 69,3 | 6 000 | 16/16 | 10/10 | 12 | run le plus rapide & le moins cher |
| medium | 3 | 105,3 | 8 533 | 16/16 | 10/10 | 12 | a noté 1′ lat = 1855 m ≠ 1852 m (ajuste ses tolérances) |
| sonnet | 1 | 154,3 | 11 501 | 16/16 | 10/10 | 17 | a dû **corriger ses scénarios de test** (conversion NM/deg) |
| sonnet | 2 | 159,0 | 10 072 | 16/16 | 10/10 | 34 | a dû corriger des **smart-quotes cassant l'ESM** + scénario divergent |
| sonnet | 3 | 112,4 | 8 262 | 16/16 | 10/10 | 31 | a relâché 1 assertion (setup géométrie de son propre test) |

¹ tokens **output** (delta budget), implémenteur seul · ² oracle caché 16 assertions · ³ juge /10.

## Agrégats (médiane, [min–max])

| Profil | Temps méd. (s) | Tokens out méd. | Correction | Propreté | Tests (méd.) |
|---|---|---|---|---|---|
| **herite** (Opus 4.8 @ xhigh) | 104,8 [78,3–124,7] | 9 617 [9,5k–10,2k] | 16/16 ×3 | 10/10 ×3 | 14 |
| **medium** (Opus 4.8 @ medium) | 105,3 [69,3–115,4] | **8 533** [6,0k–9,7k] | 16/16 ×3 | 10/10 ×3 | 12 |
| **sonnet** (Sonnet 4.6) | **154,3** [112,4–159] | 10 072 [8,3k–11,5k] | 16/16 ×3 | 10/10 ×3 | 31 |

**Normalisé (medium = 1.0)** — tokens : herite **1,13×**, sonnet **1,18×** · temps : herite **0,99×**, sonnet **1,47×**.

## Constats V2

1. **Qualité encore saturée** : 9/9 à 16/16 + 10/10, **malgré les pièges**. Même garde
   `|v|=0`, TCPA négatif et bornes `formatTcpa` sont correctement traités par les trois
   profils. → Sur un module pur bien spécifié, **même « dur », le choix de profil reste
   un arbitrage coût/latence, pas qualité.**
2. **`medium` reste le meilleur rapport** : tokens les plus bas, temps ≈ herite.
3. **`herite` (xhigh) toujours pas rentable** : +13 % de tokens vs medium, temps équivalent,
   **zéro gain de qualité** — l'effort xhigh ne paie pas à cette échelle.
4. **`sonnet` décroche sur le dur** : **+47 % de temps** (médiane 154 s) et le plus de tokens.
   Il sur-produit ses propres tests (médiane 31) **avec des erreurs initiales qu'il doit
   auto-corriger** (smart-quotes cassant l'ESM, scénarios de test faux) — d'où la latence.
   Son **module** reste correct (16/16 oracle) : qualité finale égale, mais **chemin plus bruité**.

## Synthèse V1 + V2 (18 runs)

- **La qualité n'a jamais varié** : 18/18 runs parfaits (oracle + juge), sur tâche facile
  **et** tâche piégeuse. Pour des modules purs petits et bien spécifiés, les 3 profils sont
  **équivalents en qualité** — la décision est **coût/latence**.
- **`medium` gagne partout** : le moins cher (V1 et V2), parmi les plus rapides.
- **`herite` (xhigh)** : surcoût systématique (tokens), gain nul à cette échelle. À réserver
  aux tâches **réellement dures/ambiguës/long-horizon** — hors de portée d'un harnais 9-runs,
  donc *non réfuté ici, juste non nécessaire ici*.
- **`sonnet`** : économique sur le simple ; sur le complexe, plus lent et plus de churn
  d'auto-correction. Bon mode dégradé, à éviter en latence-sensible.

## Limite honnête

L'étalon « dur » reste un **petit module mono-fichier** : il ne casse la correction d'aucun
profil. Pour voir un **vrai écart de qualité**, il faudrait une tâche d'un autre ordre
(multi-fichiers, spec ambiguë, raisonnement profond, refactor à contraintes cachées) — ce
qui est précisément là où `herite`/xhigh est censé payer en production, mais impraticable à
benchmarker en 9 runs. **Conclusion mesurable : à l'échelle benchmarkable, les profils ne
diffèrent qu'en coût/latence ; l'écart de qualité, s'il existe, vit au-dessus.**

## Coût & repro

- Coût V2 : **771 236 tokens**, **~24,9 min** (27 agents).
- Repro : session fraîche Opus 4.8 →
  `Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-hard.workflow.js' })`.
