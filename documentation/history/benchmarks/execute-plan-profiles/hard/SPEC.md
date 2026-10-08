# Spec figée — étalon DUR `cpa` (CPA / TCPA, cinématique relative)

> Tâche **identique** pour chaque run de chaque profil. Module pur, ESM, zéro
> dépendance, style simulator (`node:test`). Plus exigeante que la V1 :
> conventions de signe, garde division-par-zéro, TCPA signé, formatage à bornes.

## Livrables (chemins imposés, par run)

- Module : `<dir>/cpa.mjs` — exports **nommés** ESM.
- Tests : `<dir>/cpa.test.mjs` — `node:test` + `node:assert/strict`.

`<dir>` est fourni dans le prompt. **Ne toucher aucun fichier hors de `<dir>`.**

## Modèle de données

Un navire = `{ lat, lon, sogKn, cogDeg }` :
- `lat`, `lon` en degrés WGS-84 ; `sogKn` vitesse-fond en nœuds ; `cogDeg` route-fond
  en degrés, **0 = Nord, 90 = Est, sens horaire**.

## Conventions de calcul (IMPOSÉES — l'oracle s'aligne dessus)

- **Projection locale** equirectangulaire centrée sur la latitude de l'**ownship** :
  plan en mètres, `x = Est`, `y = Nord`, ownship à l'origine.
  - `mètresParDegréLat = 111320`
  - `mètresParDegréLon = 111320 × cos(latOwnship_rad)`
- **Vitesses** : `sog_m_par_min = sogKn × 1852 / 60` ; composantes
  `vEst = sog_m_par_min × sin(cog_rad)`, `vNord = sog_m_par_min × cos(cog_rad)`.
- **Distances** : `1 NM = 1852 m`.

## Fonctions à implémenter

### 1. `closestPointOfApproach(ownship, target)` → `{ cpaNm, tcpaMin }`

- Position relative `r` (mètres) = `target_xy − ownship_xy` (ownship à l'origine).
- Vitesse relative `v` (m/min) = `vTarget − vOwnship`.
- **Garde division-par-zéro** : si `v·v === 0` (aucun mouvement relatif) →
  `tcpaMin = 0` et `cpaNm = |r|` converti en NM. (NE PAS produire `NaN`.)
- Sinon : `tcpaMin = −(r·v) / (v·v)` (en minutes, puisque `v` est en m/min).
  - **TCPA non borné** : `tcpaMin` peut être **négatif** — la cible s'éloigne, le CPA
    géométrique est dans le passé. Le retourner tel quel (ne pas le clamper à 0).
  - `cpaNm = |r + v × tcpaMin|` converti en NM (distance à l'instant du CPA géométrique).
- **Validation** (sur les deux navires) :
  - `TypeError` si une valeur n'est pas un nombre fini (NaN/Infinity inclus).
  - `RangeError` si `lat ∉ [−90, 90]`, `lon ∉ [−180, 180]`, ou `sogKn < 0`.

Repères (oracle) : tête-à-tête rapprochant sur un méridien → `tcpaMin ≈ +6`, `cpaNm ≈ 0` ;
routes parallèles vitesses identiques → `tcpaMin = 0`, `cpaNm = écart` ; cible qui s'éloigne →
`tcpaMin ≈ −6` ; cible immobile rapprochée → `tcpaMin ≈ +12` ; les deux immobiles → garde
(`cpaNm` fini, pas `NaN`).

### 2. `formatTcpa(tcpaMin)` → `string`

- Entrée en minutes.
- Non fini (`NaN`/`±Infinity`) → `'—'` (tiret cadratin U+2014).
- Strictement négatif → `'PASSÉ'`.
- Sinon `'MM:SS'` : `total = round(tcpaMin × 60)` secondes ; `MM = floor(total / 60)`
  (**au moins 2 chiffres, non tronqué** — ex. 125 → `'125:00'`) ; `SS = total mod 60`
  (exactement 2 chiffres). Exemples : `6 → '06:00'`, `6.5 → '06:30'`, `0 → '00:00'`.

## Conventions imposées (comptent pour « conformité »)

- ESM strict (`export function …`, imports `.mjs`), zéro dépendance, aucun CommonJS.
- Pas de surface superflue ni de code mort (doctrine « simplicity first »).
- Tests `node:test` couvrant nominaux **et** limites **et** erreurs (dont la garde
  division-par-zéro, le TCPA négatif, et les bornes de `formatTcpa`).
- Auto-vérification : `node --test <dir>` au vert.
