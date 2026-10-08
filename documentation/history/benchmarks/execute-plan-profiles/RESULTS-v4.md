---
kind: benchmark-results
status: done
date: "2026-09-23"
title: "Benchmark V4 (tâche dure CPA/TCPA) — opus-5-5 contre le témoin opus-4-8"
relatedCommit: "71e09e3 (feat(agents): profil opus-5-5 pour execute-plan)"
relatedResults: "documentation/history/benchmarks/execute-plan-profiles/RESULTS-v3.md"
etalon: "hard/cpa (CPA/TCPA, cinématique relative) — identique à V2/V3"
sessionModel: "claude-opus-5-5"
runsPerProfile: 3
agentsTotal: 12
workflowTokens: 649825
workflowDurationMin: 11.0
note: "Rapport de résultats — non indexé dans INDEX.md."
---

# Benchmark V4 — Opus 5.5 contre le défaut mesuré

Première mesure du profil `opus-5-5` (Opus 5.5 @ high, 4 $ / 20 $ le MTok),
face au défaut `opus-4-8` (Opus 4.8 @ high, 5 $ / 25 $) **rejoué comme témoin
dans la même session** — les tokens de V3 ne sont pas réutilisés tels quels,
la charge et l'outillage ayant pu dériver en un mois. Même étalon, même oracle
caché, même rubrique, même consigne d'implémentation que [V3](./RESULTS-v3.md).

Script : [`run-benchmark-v4.workflow.js`](./run-benchmark-v4.workflow.js).
Écarts de protocole par rapport à V3 :

- runs **entrelacés** (4-8#1, 5-5#1, 4-8#2…) pour répartir la dérive de charge
  sur les deux profils ;
- l'**oracle caché** est rejoué par la session (`node --test
  --test-reporter=tap`), pas par un agent — la commande est déterministe ;
- le **juge** tourne sous le modèle de session, ici Opus 5.5 (Opus 5 en V3).

## Résultats détaillés (6 runs)

| Profil | Run | Temps (s) | Tokens out¹ | Oracle² | Juge³ | Tests écrits |
|---|---|---|---|---|---|---|
| opus-4-8 | 1 | 106,7 | 10 173 | 16/16 | 10/10 | 14 |
| opus-5-5 | 1 | 50,4 | 6 346 | 16/16 | 10/10 | 15 |
| opus-4-8 | 2 | 161,8 | 12 784 | 16/16 | 10/10 | 13 |
| opus-5-5 | 2 | 73,6 | 10 802 | 16/16 | 10/10 | 15 |
| opus-4-8 | 3 | 109,0 | 9 560 | 16/16 | 10/10 | 14 |
| opus-5-5 | 3 | 59,7 | 7 999 | 16/16 | 10/10 | 15 |

¹ tokens **output** (delta `budget.spent()`), implémenteur seul · ² oracle
caché, 16 blocs `test()` · ³ juge aveugle /10, grille [`RUBRIC.md`](./RUBRIC.md).

## Agrégats (médiane, [min–max])

| Profil | Temps méd. | Tokens out méd. | Dispersion tokens | Coût sortie méd.⁴ | Correction | Juge |
|---|---|---|---|---|---|---|
| **opus-4-8** (Opus 4.8 @ high) | 109,0 s | 10 173 [9,6k–12,8k] | ×1,34 | 0,254 $ | 16/16 ×3 | 10 ×3 |
| **opus-5-5** (Opus 5.5 @ high) | **59,7 s** | **7 999** [6,3k–10,8k] | ×1,70 | **0,160 $** | 16/16 ×3 | 10 ×3 |

⁴ tokens out × prix de sortie (25 $ / 20 $ le MTok) — l'entrée n'est pas
mesurée par le harnais.

**Normalisé (`opus-4-8` = 1,00)** — `opus-5-5` : tokens **0,79×**, temps
**0,55×**, coût de sortie **0,63×**.

## Constats

**1. La correction sature encore.** 16/16 à l'oracle et 10/10 au juge sur les
6 runs. Cumulé V1→V4 : 33 runs sur 33 parfaits. L'étalon mesure le coût et la
latence, pas la capacité.

**2. Opus 5.5 est moins cher sur les deux leviers à la fois.** Il émet ~21 %
de tokens en moins **et** paie chaque token 20 % moins cher : −37 % sur la
sortie en médiane. Le point d'équilibre calculé avant la campagne (1,25× les
tokens d'Opus 4.8) n'est même pas approché — il est en dessous de 1.

**3. Presque deux fois plus rapide.** 59,7 s contre 109,0 s en médiane. Avec un
bruit de temps de ±40 % (établi en V3), l'écart ×0,55 reste au-dessus du bruit :
les trois runs 5.5 (50–74 s) sont tous plus rapides que le plus rapide des
runs 4.8 (107 s).

**4. Moins prévisible, mais le pire cas reste moins cher.** Dispersion ×1,70
contre ×1,34. Le run 5.5 le plus coûteux (10 802 tokens → 0,216 $) coûte
moins que la **médiane** 4.8 (0,254 $) : pour un budget prévisionnel, la
dispersion ne renverse pas le classement.

**5. Code plus court, tests aussi complets.** Modules de 57–68 lignes contre
97–109 pour 4.8, 15 tests contre 13–14, aucun commentaire de délibération (0
occurrence sur les 6 runs, `grep` identique à V3). Le juge relève seulement
des identifiants français (`vEst`, `vNord`) côté 4.8.

## Limites propres à cette campagne

- **n = 3** par profil : lire les ordres de grandeur, pas les décimales.
- **Juge = Opus 5.5**, le modèle évalué. La note est aveugle au profil et
  sature à 10 des deux côtés : le biais possible ne peut pas départager, mais
  le constat de qualité repose sur l'oracle, pas sur la note.
- **Témoin 4.8 plus coûteux qu'en V3** (10 173 tokens médians contre 7 911).
  Cause probable : dérive d'outillage (voir ci-dessous) qui fait tâtonner les
  agents. Elle frappe les deux profils dans la même session — la comparaison
  interne tient, la comparaison absolue avec V3 non.
- **Consigne de l'étalon cassée sous Node 24.** L'étape 6 (`node --test
  <dossier>`) échoue : Node 24.14 prend le dossier pour un module. Les six
  agents ont contourné le problème par un motif de fichiers. Autre écart : l'outil PowerShell n'est pas dans
  les `tools:` de `backend-implementer`, donc le chronométrage passe par Bash.
  Un run 5.5 a stampé des secondes epoch au lieu de ticks .NET, ce qui ne change
  pas la mesure. **Corrigé depuis** dans les quatre scripts : motif
  `node --test "<dir>/*.test.mjs"`, chrono et fichiers via `node -e` (neutre
  Bash/PowerShell), oracle en `--test-reporter=tap`.
- Étalon mono-fichier : l'avantage éventuel sur les étapes longues ou ambiguës
  n'est pas mesuré ici, ni dans un sens ni dans l'autre.

## Ce que ça change pour le défaut d'`execute-plan`

Sur les trois critères qui avaient fait d'`opus-4-8` le défaut en V3 (correction
égale, coût, latence), `opus-5-5` fait **au moins aussi bien partout** et mieux
sur le coût (−37 %) et la latence (−45 %). Seule la prévisibilité recule, sans
que le pire cas dépasse la médiane du témoin.

Lecture proposée : **`opus-5-5` devient le défaut**, `opus-4-8` reste en chip
comme option la plus prévisible et en repli si Opus 5.5 est indisponible.

## Coût & repro

- Coût total : **649 825 tokens**, **~11 min** (6 implémentations + 6 juges,
  aucun incident, aucune reprise).
- Session lanceuse : **Opus 5.5**.
- Repro :
  `Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-v4.workflow.js' })`
  puis oracle :
  `node --test --test-reporter=tap "<run>/__ref.test.mjs"` après copie de
  `hard/reference/cpa.reference.test.mjs` dans chaque dossier de run.
