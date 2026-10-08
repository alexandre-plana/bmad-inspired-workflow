---
kind: benchmark-results
status: done
date: "2026-08-17"
title: "Benchmark V3 (tâche dure CPA/TCPA) — axe générationnel opus-4-6 / opus-4-8 / opus-5"
relatedCommit: "f1752eb (feat(agents): axe générationnel opus-4-6/4-8/5 pour les profils execute-plan)"
relatedTask: "documentation/history/tasks/2026-06-08_13-41_task_execute-plan-model-effort-profiles.md"
relatedResults: "documentation/history/benchmarks/execute-plan-profiles/RESULTS-v2.md"
etalon: "hard/cpa (CPA/TCPA, cinématique relative) — identique à V2"
sessionModel: "claude-opus-5"
runsPerProfile: 3
agentsTotal: 50
workflowTokens: 1748909
workflowDurationMin: 44.4
note: "Rapport de résultats — non indexé dans INDEX.md. Coût gonflé par une panne réseau et une reprise (cf. § Incident)."
---

# Benchmark V3 — axe générationnel, tâche dure (`cpa`)

Première campagne après le passage des profils d'`execute-plan` à un **axe
générationnel** (commit `f1752eb`) : `opus-4-6`, `opus-4-8`, `opus-5`, tous à
effort `high` côté implémenteur. Même étalon dur, même oracle, même rubrique et
même protocole que [V2](./RESULTS-v2.md) — les chiffres sont donc directement
comparables.

Script : [`run-benchmark-gen.workflow.js`](./run-benchmark-gen.workflow.js).

## Résultats détaillés (9 runs)

| Profil | Run | Temps (s) | Tokens out¹ | Oracle² | Juge P1³ | Juge P2³ | Tests écrits |
|---|---|---|---|---|---|---|---|
| opus-4-6 | 1 | 111,2 | 14 199 | 16/16 | 9/10 | 9/10 | 33 |
| opus-4-6 | 2 | 116,6 | 10 651 | 16/16 | 8/10 | 9/10 | 31 |
| opus-4-6 | 3 | 101,5 | 6 016 | 16/16 | 9/10 | 9/10 | 26 |
| opus-4-8 | 1 | 103,1 | 7 703 | 16/16 | 10/10 | 9/10 | 18 |
| opus-4-8 | 2 | 113,8 | 8 356 | 16/16 | 10/10 | 10/10 | 12 |
| opus-4-8 | 3 | 98,1 | 7 911 | 16/16 | 10/10 | 10/10 | 14 |
| opus-5 | 1 | 251,9 | 14 217 | 16/16 | — | 10/10 | 16 |
| opus-5 | 2 | 181,0 | 10 842 | 16/16 | — | 10/10 | 16 |
| opus-5 | 3 | 217,0 | 11 307 | 16/16 | 10/10 | 10/10 | 18 |

¹ tokens **output** (delta `budget.spent()`), implémenteur seul · ² oracle caché,
16 blocs `test()` · ³ juge aveugle /10 — **deux passes**, cf. § Bruit de mesure.

## Agrégats (médiane, [min–max])

| Profil | Temps méd. | Tokens out méd. | Dispersion tokens | Correction | Juge | Tests (méd.) |
|---|---|---|---|---|---|---|
| **opus-4-6** (Opus 4.6 @ high) | 111,2 s | 10 651 [6,0k–14,2k] | **×2,36** | 16/16 ×3 | 9 / 8-9 / 9 | 31 |
| **opus-4-8** (Opus 4.8 @ high) | **103,1 s** | **7 911** [7,7k–8,4k] | **×1,08** | 16/16 ×3 | **10 ×3** | 14 |
| **opus-5** (Opus 5 @ high) | 217,0 s | 11 307 [10,8k–14,2k] | ×1,31 | 16/16 ×3 | **10 ×3** | 16 |

**Normalisé (`opus-4-8` = 1,00)** — tokens : `opus-4-6` **1,35×**, `opus-5`
**1,43×** · temps : `opus-4-6` **1,08×**, `opus-5` **2,10×**.

## Bruit de mesure — à lire avant de conclure

La reprise après incident a rejoué `opus-5#3` dans une configuration **strictement
identique**. Écart entre les deux passages :

| Mesure | Passe 1 | Passe 2 | Écart |
|---|---|---|---|
| Temps | 151,6 s | 217,0 s | **+43 %** |
| Tokens out | 12 796 | 11 307 | −12 % |
| Juge (mêmes livrables) | 10/10 | 10/10 | — |

Conséquences directes sur la lecture du tableau :

- **Le temps est bruité à ±40 %.** L'écart `opus-4-6` vs `opus-4-8` (1,08×) est
  **dans le bruit** : ces deux profils sont indistinguables en latence. En
  revanche `opus-5` à 2,10× reste au-dessus du bruit — « nettement plus lent »
  est établi, « exactement deux fois » ne l'est pas.
- **Les tokens sont bruités à ~±12 %.** Les écarts de 1,35× et 1,43× sont donc
  réels.
- **Le juge varie de ±1 point** entre deux passes sur des livrables identiques
  (`opus-4-6#2` : 8 puis 9 ; `opus-4-8#1` : 10 puis 9). Un écart d'un point n'est
  pas un signal — c'est pourquoi le constat qui suit ne repose pas sur la note.

## Constats

**1. La correction sature, pour la troisième campagne consécutive.** 16/16 à
l'oracle caché sur les 9 runs, malgré les pièges de l'étalon (garde
division-par-zéro, TCPA négatif, convention de signe, bornes de `formatTcpa`).
Cumulé avec V1 et V2 : **27 runs sur 27 parfaits**. Sur un module pur bien
spécifié, le choix de génération ne se joue pas sur la justesse.

**2. `opus-4-6` laisse son brouillon dans le livrable — fait vérifié, pas avis
de juge.** Comptage direct des commentaires de délibération (`// Wait…`,
`// Let me…`, `// Hmm…`) dans les fichiers rendus :

| Profil | Occurrences |
|---|---|
| opus-4-6 | **9** |
| opus-4-8 | 0 |
| opus-5 | 0 |

Extraits réels : `// Let me re-read: "tete-a-tete rapprochant…"`, `// Let me just
verify the math is correct.`, `// Wait: ry = (target.lat - own.lat) * 111320`.
C'est du raisonnement en cours, pas de l'explication — exactement ce qu'on ne
veut pas voir arriver en revue. Le juge l'avait relevé indépendamment sur
plusieurs runs ; le `grep` le confirme sans ambiguïté.

**3. `opus-4-6` sur-produit ses tests sans gagner en couverture utile.** 31 tests
en médiane contre 14 pour `opus-4-8`. Le juge, à l'aveugle, y pointe des cas
redondants (cinq retombant sur la même garde `|v|=0`) et des assertions molles
— `Math.abs(tcpaMin - 6) < 0.5`, soit ±8 % de tolérance sur une arithmétique
pourtant déterministe, qui passerait pour toute une famille d'implémentations
fausses. Plus de tests, pas plus de garanties.

**4. `opus-4-8` est le plus prévisible, et de loin.** Ses trois runs tiennent
dans 8 % d'écart en tokens (7 703 – 8 356) là où `opus-4-6` varie du simple au
double et demi (×2,36). Pour du budget prévisionnel sur un plan à N étapes,
c'est le chiffre qui compte davantage que la médiane.

**5. `opus-5` est propre mais cher à cette échelle.** Qualité irréprochable
(16/16, 10/10 ×3, zéro résidu), mais 1,43× les tokens et ~2× le temps de
`opus-4-8` pour un résultat que l'oracle ne distingue pas. Sur une tâche que
`opus-4-8` réussit déjà parfaitement, la génération supérieure n'a rien à
rattraper — elle délibère davantage sans que ça change la sortie.

## Ce que ça change pour le défaut d'`execute-plan`

**Le défaut actuel est `opus-5`. Ces mesures ne le soutiennent pas** pour des
étapes de plan de cet ordre de grandeur : `opus-4-8` est aussi correct, aussi
propre, ~30 % moins cher, plus rapide et bien plus prévisible.

La nuance de V2 tient toujours et interdit de trancher trop vite : l'étalon reste
un **petit module mono-fichier**, où la qualité sature. L'avantage d'une
génération supérieure, s'il existe, vit **au-dessus** de ce que ce harnais sait
mesurer — spec ambiguë, multi-fichiers, long-horizon, contraintes cachées. Or
c'est précisément le régime de certaines étapes de plan.

Lecture proposée, à valider :

- **`opus-4-8` par défaut** pour les plans ordinaires (la majorité des étapes).
- **`opus-5` en choix explicite** pour les étapes réellement dures ou
  long-horizon, où le surcoût est une assurance et non un gaspillage.
- **`opus-4-6` déconseillé** : ni moins cher ni plus rapide que `opus-4-8`, et
  seul des trois à salir ses livrables. Sa valeur est comparative, pas
  opérationnelle — le garder pour mesurer, pas pour produire.

## Incident — panne réseau et sémantique de reprise

Deux runs `opus-5` sont morts en campagne 1 sur `API Error: Unable to connect to
API (ENOTFOUND)` — panne DNS transitoire, **pas** une indisponibilité de modèle
(les trois modèles avaient été sondés avec succès avant lancement). La campagne a
été reprise via `resumeFromRunId`.

Deux pièges à retenir pour les campagnes futures :

1. **La reprise rejoue le plus long préfixe inchangé, pas les seuls agents en
   échec.** Le premier appel non caché étant `opus-5#1`, **tout ce qui suit a
   tourné en réel** — les trois runs `opus-5` et l'intégralité de la phase Score.
   D'où deux passes de juge sur les mêmes livrables (exploité ici comme mesure du
   bruit).
2. **Les agents rejoués depuis le cache consomment 0 token**, donc les
   `tokensOut` du second passage sont nuls pour le préfixe caché. Les chiffres
   ci-dessus sourcent chaque profil **sur la passe où il a réellement exécuté** :
   campagne 1 pour `opus-4-6` et `opus-4-8`, reprise pour `opus-5`. Recoller
   naïvement les deux sorties produirait des zéros ou des mélanges incohérents.

## Coût & repro

- Coût total : **1 748 909 tokens**, **~44,4 min** (23 agents en campagne 1 +
  27 en reprise, dont 6 rejoués depuis le cache). Une campagne sans incident
  coûte l'équivalent de la seule passe 1, soit ~848 000 tokens / ~28 min — du
  même ordre que les 771 000 / 25 min de V2.
- Session lanceuse : **Opus 5** (sans effet ici, aucun profil `herite` dans la
  campagne).
- Repro :
  `Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-gen.workflow.js' })`
- Sonder les modèles avant lancement (un agent jetable par profil) : quelques
  secondes contre le risque de découvrir un modèle non servi au 20ᵉ agent.
