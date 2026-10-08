---
kind: benchmark-results
status: done
date: "2026-09-28"
title: "Benchmark V5 (tâche dure CPA/TCPA) — effort des sous-agents Opus 5.5 : medium contre high"
relatedResults: "documentation/history/benchmarks/execute-plan-profiles/RESULTS-v4.md"
etalon: "hard/cpa (CPA/TCPA, cinématique relative) — identique à V2→V4"
sessionModel: "claude-opus-5-5"
runsPerProfile: 3
agentsTotal: 12
workflowTokens: 590019
workflowDurationMin: 4.9
note: "Rapport de résultats — non indexé dans INDEX.md."
---

# Benchmark V5 — Opus 5.5 : effort medium contre high

Cette campagne mesure l'effet de l'**effort** des sous-agents, à modèle
constant. Elle compare `opus-5-5-medium` (implémenteur Opus 5.5 @ medium) au
défaut `opus-5-5` (Opus 5.5 @ high). Même étalon, même oracle caché, même
rubrique et même protocole que [V4](./RESULTS-v4.md), à ceci près que V5
tourne avec la consigne **corrigée pour Node 24** (commande de test en motif de
fichiers, commandes `node -e` qui fonctionnent sous Bash comme sous
PowerShell).

Script : [`run-benchmark-v5.workflow.js`](./run-benchmark-v5.workflow.js).
Les runs sont entrelacés. L'oracle est rejoué par la session en
`--test-reporter=tap`. Le juge tourne sous Opus 5.5, qui est aussi le modèle
de session.

## Résultats détaillés (6 runs)

| Profil | Run | Temps (s) | Tokens out¹ | Oracle² | Juge³ | Tests écrits |
|---|---|---|---|---|---|---|
| opus-5-5 | 1 | 43,1 | 6 156 | 16/16 | 10/10 | 40 |
| opus-5-5-medium | 1 | 32,7 | 4 869 | 16/16 | 10/10 | 12 |
| opus-5-5 | 2 | 37,4 | 5 580 | 16/16 | 10/10 | 14 |
| opus-5-5-medium | 2 | 31,4 | 4 642 | 16/16 | 10/10 | 11 |
| opus-5-5 | 3 | 53,5 | 6 998 | 16/16 | 10/10 | 13 |
| opus-5-5-medium | 3 | 29,0 | 4 291 | 16/16 | 10/10 | 10 |

¹ tokens **output** (delta `budget.spent()`), implémenteur seul · ² oracle
caché, 16 blocs `test()` · ³ juge aveugle /10, grille [`RUBRIC.md`](./RUBRIC.md).

## Agrégats (médiane, [min–max])

| Profil | Temps méd. | Tokens out méd. | Dispersion tokens | Coût sortie méd.⁴ | Correction | Juge | Tests (méd.) |
|---|---|---|---|---|---|---|---|
| **opus-5-5** (Opus 5.5 @ high) | 43,1 s | 6 156 [5,6k–7,0k] | ×1,25 | 0,123 $ | 16/16 ×3 | 10 ×3 | 14 |
| **opus-5-5-medium** (Opus 5.5 @ medium) | **31,4 s** | **4 642** [4,3k–4,9k] | **×1,13** | **0,093 $** | 16/16 ×3 | 10 ×3 | 11 |

⁴ tokens out × 20 $ le MTok (même modèle, même prix) — l'entrée n'est pas
mesurée par le harnais.

**Normalisé (`opus-5-5` = 1,00)** — `opus-5-5-medium` : tokens **0,75×**, temps
**0,73×**, coût de sortie **0,75×**.

## Constats

**1. La correction sature toujours.** 16/16 à l'oracle et 10/10 au juge sur les
6 runs. Cumulé de V1 à V5 : 39 runs sur 39 parfaits.

**2. Medium coûte un quart de moins, sans recouvrement.** −25 % de tokens et
−27 % de temps en médiane. Le run medium le plus cher (4 869 tokens) reste
sous le run high le moins cher (5 580). Même constat pour le temps : 32,7 s au
pire en medium, contre 37,4 s au mieux en high. L'écart n'est pas du bruit.

**3. Medium est aussi le plus régulier.** ×1,13 de dispersion contre ×1,25. Le
recul de prévisibilité noté en V4 pour Opus 5.5 venait donc en partie de
l'effort `high`, pas seulement du modèle.

**4. Ce que medium économise, ce sont surtout des tests.** Il écrit 10 à 12
tests, contre 13 à 14 en high, hors l'anomalie de 40 tests du run high n° 1.
Ses modules sont aussi un peu plus courts (52–53 lignes contre 54–62). Le
juge, à l'aveugle, note pourtant la couverture de medium à 2/2 sur les trois
runs : elle couvre les mêmes pièges (garde |v| = 0, TCPA négatif, −0, report
de l'arrondi, TypeError/RangeError aux bornes). Il relève seulement un
commentaire d'unité manquant.

**5. La consigne corrigée a allégé toutes les mesures.** Le même profil
`opus-5-5` (high) passe de 7 999 tokens médians en V4 à 6 156 en V5 (−23 %), et
de 59,7 s à 43,1 s. C'est cohérent avec l'hypothèse de V4 : sous l'ancienne
consigne, les agents tâtonnaient autour de `node --test <dossier>`. Les chiffres
absolus de V4 et de V5 ne se comparent donc pas ; seuls les écarts mesurés à
l'intérieur de chaque campagne comptent.

## Limites propres à cette campagne

- **n = 3** par profil : lire les ordres de grandeur, pas les décimales.
- **Étalon mono-fichier et bien spécifié.** Un effort plus bas délibère moins.
  Sur une étape ambiguë, multi-fichiers ou avec des contraintes cachées, c'est
  précisément là qu'il peut rater un piège, et ce harnais ne sait pas le voir.
  V5 établit que medium ne coûte rien en qualité **à cette échelle**, pas au-delà.
- **Juge = Opus 5.5**, le modèle évalué. Sa note sature à 10 des deux côtés ;
  le constat de qualité repose sur l'oracle.
- Le **verifier** n'est pas mesuré : dans `opus-5-5-medium`, il reste
  `verifier-opus-5-5` à effort max. C'est lui qui rattrape un éventuel
  raccourci de l'implémenteur.

## Ce que ça change pour le défaut d'`execute-plan`

Sur cet étalon, medium fait aussi bien que high en correction et en qualité.
Il coûte 25 % de moins, va 27 % plus vite et varie moins d'un run à l'autre.
C'est le même constat que V2 sur Opus 4.8, où `medium` gagnait partout.

**Décision (28/09) : lecture A retenue** — `opus-5-5-medium` est le défaut
d'`execute-plan`, `opus-5-5` (high) reste en chip pour les plans durs.

Les deux lectures soumises à l'utilisateur :

- **A — `opus-5-5-medium` devient le défaut.** `opus-5-5` (high) reste
  proposé au lancement pour les plans durs, ambigus ou long-horizon. Le
  verifier en max joue le rôle de filet de sécurité.
- **B — `opus-5-5` (high) reste le défaut.** `opus-5-5-medium` est proposé au
  lancement comme mode économique, pour les plans simples ou bien spécifiés.

## Coût & repro

- Coût total : **590 019 tokens**, **~5 min** (6 implémentations + 6 juges,
  aucun incident).
- Session lanceuse : **Opus 5.5**.
- Repro :
  `Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-v5.workflow.js' })`
  puis, pour chaque dossier de run, copier `hard/reference/cpa.reference.test.mjs`
  en `__ref.test.mjs` et lancer `node --test --test-reporter=tap
  "<run>/__ref.test.mjs"`.
