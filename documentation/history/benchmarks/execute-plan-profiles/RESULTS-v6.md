---
kind: benchmark-results
status: done
date: "2026-09-29"
title: "Benchmark V6 (tâche dure CPA/TCPA) — Sonnet 5.5 medium contre Opus 5.5 medium"
relatedResults: "documentation/history/benchmarks/execute-plan-profiles/RESULTS-v5.md"
etalon: "hard/cpa (CPA/TCPA, cinématique relative) — identique à V2→V5"
sessionModel: "claude-opus-5-5"
runsPerProfile: 3
agentsTotal: 12
workflowTokens: 592899
workflowDurationMin: 6.1
note: "Rapport de résultats — non indexé dans INDEX.md."
---

# Benchmark V6 — Sonnet 5.5 contre le défaut Opus 5.5 medium

Cette campagne mesure le profil `sonnet-5-5` (implémenteur Sonnet 5.5 @ medium,
2 $ / 10 $ le MTok) face au défaut `opus-5-5-medium` (Opus 5.5 @ medium,
4 $ / 20 $), à effort égal. Medium est le point de départ que recommande
Anthropic pour Sonnet 5.5 en code agentique, et c'est aussi l'effort du défaut
actuel.

Étalon, oracle caché, rubrique et protocole sont ceux de [V5](./RESULTS-v5.md) :
runs entrelacés, consigne corrigée pour Node 24, oracle rejoué par la session
en `--test-reporter=tap`, juge aveugle sous Opus 5.5 (modèle de session).
Script : [`run-benchmark-v6.workflow.js`](./run-benchmark-v6.workflow.js).
Un agent-sonde lancé avant la campagne a confirmé que la variante tourne bien
sur `claude-sonnet-5-5`.

## Résultats détaillés (6 runs)

| Profil | Run | Temps (s) | Tokens out¹ | Oracle² | Juge³ | Tests écrits |
|---|---|---|---|---|---|---|
| opus-5-5-medium | 1 | 29,3 | 4 763 | 16/16 | 10/10 | 10 |
| sonnet-5-5 | 1 | 45,0⁵ | 5 531 | 16/16 | 10/10 | 15 |
| opus-5-5-medium | 2 | 56,8 | 4 516 | 16/16 | 10/10 | 11 |
| sonnet-5-5 | 2 | 28,4 | 4 305 | 16/16 | 10/10 | 12 |
| opus-5-5-medium | 3 | 43,9 | 4 927 | 16/16 | 10/10 | 11 |
| sonnet-5-5 | 3 | 34,2 | 4 287 | 16/16 | 10/10 | 13 |

¹ tokens **output** (delta `budget.spent()`), implémenteur seul · ² oracle
caché, 16 blocs `test()` · ³ juge aveugle /10, grille [`RUBRIC.md`](./RUBRIC.md) ·
⁵ valeur arrondie par l'agent : il a mesuré 42,1 s avant sa dernière exécution
de tests, puis a reporté 45.

## Agrégats (médiane, [min–max])

| Profil | Temps méd. | Tokens out méd. | Dispersion tokens | Coût sortie méd.⁴ | Correction | Juge | Tests (méd.) |
|---|---|---|---|---|---|---|---|
| **opus-5-5-medium** (Opus 5.5 @ medium) | 43,9 s | 4 763 [4,5k–4,9k] | ×1,09 | 0,095 $ | 16/16 ×3 | 10 ×3 | 11 |
| **sonnet-5-5** (Sonnet 5.5 @ medium) | **34,2 s** | **4 305** [4,3k–5,5k] | ×1,29 | **0,043 $** | 16/16 ×3 | 10 ×3 | 13 |

⁴ tokens out × prix de sortie (20 $ / 10 $ le MTok). L'entrée n'est pas
mesurée par le harnais ; son prix est lui aussi divisé par deux (4 $ → 2 $).

**Normalisé (`opus-5-5-medium` = 1,00)** — `sonnet-5-5` : tokens **0,90×**,
temps **0,78×**, coût de sortie **0,45×**.

## Constats

**1. La correction sature toujours.** 16/16 à l'oracle et 10/10 au juge sur
les 6 runs. Cumulé de V1 à V6 : 45 runs sur 45 parfaits.

**2. Sonnet 5.5 coûte moins de la moitié.** −55 % en coût de sortie médian.
L'essentiel vient du prix (moitié de celui d'Opus 5.5) ; le reste vient de
~10 % de tokens en moins. Même son run le plus cher (5 531 tokens, 0,055 $)
coûte moins que le run Opus le moins cher (4 516 tokens, 0,090 $).

**3. Le temps est comparable.** Médiane de 34,2 s contre 43,9 s, mais les plages
se chevauchent (28–45 s contre 29–57 s) et le bruit de temps est de ±40 %
(établi en V3). On peut dire « pas plus lent », pas « plus rapide ».

**4. Sonnet est un peu moins régulier.** ×1,29 de dispersion contre ×1,09,
à cause d'un run (n° 1) où l'agent a écrit des tests aux distances fausses
(10 NM au lieu de 2 NM) avant de les corriger lui-même. Le livrable final est
juste, mais il a fallu une boucle de plus.

**5. Code aussi propre, tests un peu plus nombreux.** Modules de 49–50 lignes
contre 51–53, 12 à 15 tests contre 10 à 11, aucun commentaire de délibération.
Le juge, à l'aveugle, ne distingue pas les deux modèles.

## Limites propres à cette campagne

- **n = 3** par profil : lire les ordres de grandeur.
- **Étalon mono-fichier et bien spécifié.** Anthropic présente Sonnet 5.5
  comme le modèle du code agentique courant et oriente le travail long et le
  plus difficile vers un Opus. Ce harnais ne sait pas voir cette frontière :
  V6 établit l'égalité **à cette échelle**, pas au-delà.
- **Juge = Opus 5.5.** Sa note sature à 10 des deux côtés ; le constat de
  qualité repose sur l'oracle.
- **Verifier non mesuré.** Dans `sonnet-5-5`, il reste `verifier-opus-5-5`
  (max). C'est lui qui rattrape un éventuel raccourci de l'implémenteur,
  notamment le risque signalé par Anthropic : Sonnet 5.5 déclare parfois une
  modification terminée sans l'avoir testée (surtout en effort low).

## Ce que ça change pour `execute-plan`

Sur cet étalon, `sonnet-5-5` fait aussi bien qu'`opus-5-5-medium` en correction
et en qualité, pour moins de la moitié du coût et sans être plus lent. Le
profil devient donc un vrai **mode économique** : il remplace l'ancien profil
`sonnet` (modèle non épinglé, verifier Opus 5).

Lecture proposée : **garder `opus-5-5-medium` par défaut** et **proposer
`sonnet-5-5` au lancement** pour les plans simples ou bien spécifiés, où le
harnais montre qu'il suffit. Passer Sonnet 5.5 en défaut demanderait une mesure
sur une tâche plus longue ou plus ambiguë, que ce banc ne sait pas encore faire.

## Coût & repro

- Coût total : **592 899 tokens**, **~6 min** (6 implémentations + 6 juges,
  aucun incident).
- Session lanceuse : **Opus 5.5**.
- Repro :
  `Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-v6.workflow.js' })`
  puis, pour chaque dossier de run, copier `hard/reference/cpa.reference.test.mjs`
  en `__ref.test.mjs` et lancer `node --test --test-reporter=tap
  "<run>/__ref.test.mjs"`.
