# Benchmark — profils d'exécution `execute-plan`

Comparatif des profils de modèle/effort d'`execute-plan` sur une **tâche-étalon
identique**, pour trancher le choix de profil sur des chiffres plutôt qu'au
ressenti.

Deux étalons, deux scripts :

| Étalon | Tâche | Oracle caché | Script | Campagnes |
|---|---|---|---|---|
| **facile** | module pur `geo-nav` (style simulator), [`SPEC.md`](./SPEC.md) | [`reference/geo-nav.reference.test.mjs`](./reference/geo-nav.reference.test.mjs) — 27 tests | `run-benchmark.workflow.js` | [V1](./RESULTS-v1.md) |
| **dur** | `cpa` (CPA/TCPA, cinématique relative), [`hard/SPEC.md`](./hard/SPEC.md) | `hard/reference/cpa.reference.test.mjs` — 16 tests | `run-benchmark-hard.workflow.js` | [V2](./RESULTS-v2.md) |
| **dur** (même étalon) | idem V2, mais sur l'axe générationnel | idem | `run-benchmark-gen.workflow.js` | [V3](./RESULTS-v3.md) |
| **dur** (même étalon) | `opus-5-5` contre le témoin `opus-4-8`, runs entrelacés | idem (rejoué par la session) | `run-benchmark-v4.workflow.js` | [V4](./RESULTS-v4.md) |
| **dur** (même étalon) | effort des sous-agents Opus 5.5 : `opus-5-5-medium` contre `opus-5-5` (high), consigne Node 24 corrigée | idem (rejoué par la session) | `run-benchmark-v5.workflow.js` | [V5](./RESULTS-v5.md) |
| **dur** (même étalon) | `sonnet-5-5` (Sonnet 5.5 @ medium) contre le défaut `opus-5-5-medium` | idem (rejoué par la session) | `run-benchmark-v6.workflow.js` | [V6](./RESULTS-v6.md) |

L'étalon dur est volontairement piégeux (garde division-par-zéro, convention de
signe cog, TCPA négatif, bornes de `formatTcpa`) : il existe pour **discriminer
la qualité**, là où l'étalon facile sature.

## Métriques

| Métrique | Comment elle est mesurée |
|---|---|
| **Temps** | Auto-chronométré par l'agent (`Date.now()` via `node -e` avant/après — neutre Bash/PowerShell —, stampé dans un fichier car l'état shell ne persiste pas entre appels) → `elapsedSeconds`. Phase séquentielle pour éviter la contention machine. |
| **Tokens** | Delta `budget.spent()` (tokens output du Workflow) autour de chaque agent d'implémentation. |
| **Correction** | **Oracle caché** rejoué sur le code produit → `refPassed/refTotal`. Jamais montré aux implémenteurs. |
| **Conformité / propreté** | Agent **juge** appliquant [`RUBRIC.md`](./RUBRIC.md) (5 critères × 0-2 = /10), à l'aveugle du profil. |

## Profils comparés (routage fidèle)

Depuis la bascule vers l'axe générationnel (commit `f1752eb`), les profils
d'`execute-plan` sont au nombre de cinq :

| Profil | `subagent_type` implémenteur | `model` |
|---|---|---|
| `herite` | `backend-implementer` | _(inherit session)_ |
| `opus-4-6` | `backend-implementer-opus-4-6` | _(frontmatter opus-4-6 @ high)_ |
| `opus-4-8` | `backend-implementer-opus-4-8` | _(frontmatter opus-4-8 @ high)_ |
| `opus-5` | `backend-implementer-opus-5` | _(frontmatter opus-5 @ high)_ |
| `sonnet` | `backend-implementer` | `sonnet` |

> **`herite` n'est pas une constante.** Il hérite du modèle/effort **de la
> session qui lance le benchmark** — le comparer aux profils épinglés n'a de sens
> qu'en notant le modèle de session dans le rapport de campagne. Les campagnes V1
> et V2 tournaient en session Opus 4.8 (donc `herite` = Opus 4.8 @ xhigh).
>
> Le profil `medium` des campagnes V1/V2 (`*-opus-medium`, Opus 4.8 @ medium)
> **n'existe plus** comme profil ; ses fichiers d'agents peuvent subsister, ce
> qui permet de rejouer `run-benchmark-hard.workflow.js` à l'identique.

## Protocole

- **N profils × 3 runs**, chaque implémentation dans un dossier isolé
  `work/<profil>/run<N>/` (pas de collision, pas de worktree).
- Phase 1 **Implement** séquentielle (chrono/tokens non contendus).
- Phase 2 **Score** parallèle (oracle + juge par run).
- Le juge tourne sous un modèle **constant** (instrument fixe, hors variables).

## Prérequis

1. Les variantes d'agents sollicitées doivent être **dans le registre de
   subagents** de la session, sinon `Agent type '…' not found`. Historiquement
   cela imposait une session fraîche ; en août 2026 la création d'un fichier
   `.claude/agents/*.md` a été observée comme prise en compte **à chaud**, sans
   redémarrage. Vérifier plutôt que supposer.
2. Noter le **modèle de session** dans le rapport si `herite` fait partie de la
   campagne (cf. note ci-dessus).
3. `node` disponible en CLI (pour `node --test` / `node --check`). Sous Node 24,
   `node --test` n'accepte plus un dossier nu : les consignes passent un motif
   `"<dir>/*.test.mjs"`, et l'oracle se lit avec `--test-reporter=tap`.
4. Sonder la disponibilité des modèles épinglés avant une longue campagne : un
   agent jetable par profil (« réponds OK, n'utilise aucun outil ») coûte
   quelques secondes et évite de découvrir un modèle non servi au 20ᵉ agent.

## Lancement

```
Workflow({ scriptPath: 'documentation/history/benchmarks/execute-plan-profiles/run-benchmark-gen.workflow.js' })
```

Le Workflow tourne en arrière-plan (9 implémentations séquentielles → prévoir
plusieurs dizaines de minutes) et notifie à la fin. Il retourne un objet
`{ campaign, etalon, profiles, runsPerProfile, results[] }` ; chaque `results[i]`
porte `tokensOut`, `impl.elapsedSeconds`, `oracle.refPassed/refTotal`,
`judge.total`. L'agrégation (médiane + dispersion par profil) se fait ensuite
dans la session.

## Nettoyage

Tout est jetable :

```powershell
Remove-Item -Recurse -Force documentation/history/benchmarks/execute-plan-profiles/hard/work
```

Conserver les `SPEC.md`, `reference/`, `RUBRIC.md`, les scripts et ce README pour
rejouer. **Ne pas committer `work/`** (déjà couvert par le `.gitignore` local).

## Limites assumées

- **n=3** réduit le bruit sans l'éliminer — lire les résultats en ordre de
  grandeur, pas au token près.
- Le benchmark isole la **phase d'implémentation** (là où les profils diffèrent
  le plus). L'écart de **gate de vérification** (`verifier` vs `verifier-opus-*`)
  est un second axe, non couvert.
- `budget.spent()` est cumulatif/partagé ; l'attribution par run est fiable
  **parce que** la phase Implement est séquentielle.
- L'étalon reste un **petit module mono-fichier**. V1 et V2 ont montré que la
  qualité y sature (18/18 runs parfaits) : à cette échelle le benchmark mesure
  honnêtement le **coût et la latence**, pas la capacité. Un écart de qualité, s'il
  existe, se joue au-dessus (multi-fichiers, spec ambiguë, long-horizon).
