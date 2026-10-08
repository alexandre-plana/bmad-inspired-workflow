# Spec figée — étalon de benchmark `geo-nav`

> Spec **identique** remise à chaque run de chaque profil. Ne pas la modifier
> entre les runs (sinon le comparatif n'a plus de sens). Module pur, ESM, zéro
> dépendance — style simulator (`node:test`).

## Livrables (chemins imposés, par run)

- Module : `<dir>/geo-nav.mjs` — exports **nommés** ESM.
- Tests : `<dir>/geo-nav.test.mjs` — `node:test` + `node:assert/strict`.

`<dir>` est fourni dans le prompt du run (`.../work/<profil>/run<N>`). **Ne toucher
aucun fichier hors de `<dir>`.**

## Fonctions à implémenter

### 1. `knotsToMetersPerMinute(knots)`
- Convertit des nœuds en mètres/minute. 1 nœud = 1 mille marin (1852 m) par heure.
- Retour : `knots * 1852 / 60`.
- Lève `TypeError` si `knots` n'est pas un nombre fini.

### 2. `shortestBearingDeltaDeg(fromDeg, toDeg)`
- Plus petit écart angulaire **signé** pour aller du cap `fromDeg` au cap `toDeg`.
- Positif = sens horaire (cap croissant). Plage de sortie `(-180, 180]`.
- Un demi-tour exact (|écart| = 180) retourne **+180**.
- Entrées en degrés, éventuellement négatives ou > 360 (normaliser).
- Lève `TypeError` si une entrée n'est pas un nombre fini.
- Exemples : `(10,20)→10` · `(20,10)→-10` · `(350,10)→20` · `(10,350)→-20`
  · `(0,180)→180` · `(0,-180)→180` · `(370,10)→0` · `(-10,-20)→-10`.

### 3. `haversineNm(a, b)`
- Distance orthodromique en **milles marins** entre `a` et `b`, chacun `{ lat, lon }`
  en degrés. Formule de haversine, rayon terrestre **R = 3440.065 NM**.
- Lève `TypeError` si une coordonnée n'est pas un nombre fini.
- Lève `RangeError` si `lat ∉ [-90, 90]` ou `lon ∉ [-180, 180]`.
- Repères : `({0,0},{0,0})→0` · `({0,0},{1,0})≈60.04` · symétrique `(a,b)===(b,a)`.

### 4. `etaMinutes(distanceNm, speedKn)`
- Temps en minutes pour parcourir `distanceNm` à `speedKn` nœuds.
- Si `speedKn === 0` → `Infinity`. Sinon `distanceNm / speedKn * 60`.
- Lève `TypeError` si une entrée n'est pas un nombre fini.
- Lève `RangeError` si `distanceNm < 0` ou `speedKn < 0`.
- Exemples : `(10,60)→10` · `(30,10)→180` · `(5,0)→Infinity`.

## Conventions imposées (comptent pour la note « conformité »)

- ESM strict : `export function …`, imports avec extension explicite `.mjs`.
- Aucune dépendance externe ; aucun `require`/CommonJS.
- Pas de surface superflue (pas d'abstraction spéculative, pas de code mort) —
  doctrine XPLOR « simplicity first ».
- Tests `node:test` couvrant cas nominaux **et** cas limites **et** cas d'erreur.
- Auto-vérification : `node --test <dir>` doit passer au vert.
