// Oracle de correction CACHÉ (étalon dur) — ne jamais montrer aux implémenteurs.
// Le scorer le copie à côté de cpa.mjs puis lance `node --test`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { closestPointOfApproach, formatTcpa } from './cpa.mjs';

const M_PER_DEG_LAT = 111320;
const NM_M = 1852;
const B = { lat: 43.0, lon: 7.0 };
const cosLat = Math.cos((B.lat * Math.PI) / 180);
const north = (nm) => B.lat + (nm * NM_M) / M_PER_DEG_LAT;
const east = (nm) => B.lon + (nm * NM_M) / (M_PER_DEG_LAT * cosLat);
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// --- closestPointOfApproach : cas analytiques exacts (1D / parallèle) ---
test('ref:cpa tête-à-tête rapprochant -> tcpa +6, cpa ~0', () => {
  const r = closestPointOfApproach(
    { lat: B.lat, lon: B.lon, sogKn: 10, cogDeg: 0 },
    { lat: north(2), lon: B.lon, sogKn: 10, cogDeg: 180 }
  );
  assert.ok(near(r.tcpaMin, 6, 0.05), `tcpa ~6 attendu, obtenu ${r.tcpaMin}`);
  assert.ok(r.cpaNm < 0.02, `cpa ~0 attendu, obtenu ${r.cpaNm}`);
});

test('ref:cpa parallèle vitesses identiques -> tcpa 0, cpa = écart 1 NM', () => {
  const r = closestPointOfApproach(
    { lat: B.lat, lon: B.lon, sogKn: 12, cogDeg: 45 },
    { lat: B.lat, lon: east(1), sogKn: 12, cogDeg: 45 }
  );
  assert.ok(near(r.tcpaMin, 0, 1e-6), `tcpa 0 attendu, obtenu ${r.tcpaMin}`);
  assert.ok(near(r.cpaNm, 1, 0.02), `cpa 1 NM attendu, obtenu ${r.cpaNm}`);
});

test('ref:cpa cible qui s\'éloigne -> tcpa négatif (~ -6)', () => {
  const r = closestPointOfApproach(
    { lat: B.lat, lon: B.lon, sogKn: 10, cogDeg: 180 },
    { lat: north(2), lon: B.lon, sogKn: 10, cogDeg: 0 }
  );
  assert.ok(near(r.tcpaMin, -6, 0.05), `tcpa ~ -6 attendu, obtenu ${r.tcpaMin}`);
  assert.ok(r.cpaNm < 0.02, `cpa ~0 attendu, obtenu ${r.cpaNm}`);
});

test('ref:cpa cible immobile, own rapproche -> tcpa +12', () => {
  const r = closestPointOfApproach(
    { lat: B.lat, lon: B.lon, sogKn: 10, cogDeg: 0 },
    { lat: north(2), lon: B.lon, sogKn: 0, cogDeg: 0 }
  );
  assert.ok(near(r.tcpaMin, 12, 0.05), `tcpa ~12 attendu, obtenu ${r.tcpaMin}`);
  assert.ok(r.cpaNm < 0.02, `cpa ~0 attendu, obtenu ${r.cpaNm}`);
});

test('ref:cpa garde |v|=0 (deux immobiles) -> pas de NaN, cpa = 3 NM', () => {
  const r = closestPointOfApproach(
    { lat: B.lat, lon: B.lon, sogKn: 0, cogDeg: 0 },
    { lat: B.lat, lon: east(3), sogKn: 0, cogDeg: 0 }
  );
  assert.ok(Number.isFinite(r.cpaNm), `cpa fini attendu, obtenu ${r.cpaNm}`);
  assert.equal(r.tcpaMin, 0);
  assert.ok(near(r.cpaNm, 3, 0.02), `cpa 3 NM attendu, obtenu ${r.cpaNm}`);
});

test('ref:cpa croisement -> propriétés (tcpa>0, 0<=cpa<d0)', () => {
  const r = closestPointOfApproach(
    { lat: B.lat, lon: B.lon, sogKn: 10, cogDeg: 0 },
    { lat: north(3), lon: east(3), sogKn: 10, cogDeg: 270 }
  );
  const d0 = Math.hypot(3, 3);
  assert.ok(r.tcpaMin > 0, `tcpa > 0 attendu, obtenu ${r.tcpaMin}`);
  assert.ok(r.cpaNm >= 0 && r.cpaNm < d0, `cpa dans [0,${d0.toFixed(3)}) attendu, obtenu ${r.cpaNm}`);
});

// --- validation ---
test('ref:cpa lat hors borne -> RangeError', () => {
  assert.throws(() => closestPointOfApproach(
    { lat: 91, lon: 0, sogKn: 10, cogDeg: 0 },
    { lat: 0, lon: 0, sogKn: 10, cogDeg: 0 }
  ), RangeError);
});

test('ref:cpa sog négatif -> RangeError', () => {
  assert.throws(() => closestPointOfApproach(
    { lat: 43, lon: 7, sogKn: -1, cogDeg: 0 },
    { lat: 43, lon: 7, sogKn: 10, cogDeg: 0 }
  ), RangeError);
});

test('ref:cpa cog NaN -> TypeError', () => {
  assert.throws(() => closestPointOfApproach(
    { lat: 43, lon: 7, sogKn: 10, cogDeg: NaN },
    { lat: 43, lon: 7, sogKn: 10, cogDeg: 0 }
  ), TypeError);
});

// --- formatTcpa ---
test('ref:formatTcpa 6 -> 06:00', () => assert.equal(formatTcpa(6), '06:00'));
test('ref:formatTcpa 6.5 -> 06:30', () => assert.equal(formatTcpa(6.5), '06:30'));
test('ref:formatTcpa 0 -> 00:00', () => assert.equal(formatTcpa(0), '00:00'));
test('ref:formatTcpa 125 -> 125:00 (MM non tronqué)', () => assert.equal(formatTcpa(125), '125:00'));
test('ref:formatTcpa négatif -> PASSÉ', () => assert.equal(formatTcpa(-6), 'PASSÉ'));
test('ref:formatTcpa Infinity -> tiret', () => assert.equal(formatTcpa(Infinity), '—'));
test('ref:formatTcpa NaN -> tiret', () => assert.equal(formatTcpa(NaN), '—'));
