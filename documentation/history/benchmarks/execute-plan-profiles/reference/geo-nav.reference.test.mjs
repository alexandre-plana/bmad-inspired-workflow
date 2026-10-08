// Oracle de correction CACHÉ — ne jamais montrer aux agents implémenteurs.
// Le scorer le copie dans le dossier du run (à côté de geo-nav.mjs) puis lance
// `node --test`. Sert de vérité-terrain objective de correction.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  knotsToMetersPerMinute,
  shortestBearingDeltaDeg,
  haversineNm,
  etaMinutes
} from './geo-nav.mjs';

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1. knotsToMetersPerMinute
test('ref:knots 60 -> 1852', () => assert.ok(near(knotsToMetersPerMinute(60), 1852)));
test('ref:knots 0 -> 0', () => assert.equal(knotsToMetersPerMinute(0), 0));
test('ref:knots 10 -> 308.6667', () => assert.ok(near(knotsToMetersPerMinute(10), 10 * 1852 / 60)));
test('ref:knots NaN throws TypeError', () => assert.throws(() => knotsToMetersPerMinute(NaN), TypeError));
test('ref:knots string throws TypeError', () => assert.throws(() => knotsToMetersPerMinute('5'), TypeError));

// 2. shortestBearingDeltaDeg
test('ref:bearing 10->20 = +10', () => assert.ok(near(shortestBearingDeltaDeg(10, 20), 10)));
test('ref:bearing 20->10 = -10', () => assert.ok(near(shortestBearingDeltaDeg(20, 10), -10)));
test('ref:bearing 350->10 = +20', () => assert.ok(near(shortestBearingDeltaDeg(350, 10), 20)));
test('ref:bearing 10->350 = -20', () => assert.ok(near(shortestBearingDeltaDeg(10, 350), -20)));
test('ref:bearing 0->180 = +180', () => assert.ok(near(shortestBearingDeltaDeg(0, 180), 180)));
test('ref:bearing 0->-180 = +180', () => assert.ok(near(shortestBearingDeltaDeg(0, -180), 180)));
test('ref:bearing 370->10 = 0', () => assert.ok(near(shortestBearingDeltaDeg(370, 10), 0)));
test('ref:bearing -10->-20 = -10', () => assert.ok(near(shortestBearingDeltaDeg(-10, -20), -10)));
test('ref:bearing NaN throws TypeError', () => assert.throws(() => shortestBearingDeltaDeg(NaN, 0), TypeError));

// 3. haversineNm
test('ref:haversine identique -> 0', () => assert.ok(near(haversineNm({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0, 1e-6)));
test('ref:haversine 1deg lat ~= 60.04 NM', () => {
  const d = haversineNm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
  assert.ok(d > 59.9 && d < 60.2, `attendu ~60.04, obtenu ${d}`);
});
test('ref:haversine symetrique', () => {
  const a = { lat: 43.58, lon: 7.12 };
  const b = { lat: 43.70, lon: 7.27 };
  assert.ok(near(haversineNm(a, b), haversineNm(b, a), 1e-6));
});
test('ref:haversine Antibes-Nice dans [9.4,10.0] NM', () => {
  const d = haversineNm({ lat: 43.58, lon: 7.12 }, { lat: 43.70, lon: 7.27 });
  assert.ok(d > 9.4 && d < 10.0, `obtenu ${d}`);
});
test('ref:haversine lat 91 throws RangeError', () => assert.throws(() => haversineNm({ lat: 91, lon: 0 }, { lat: 0, lon: 0 }), RangeError));
test('ref:haversine lon 200 throws RangeError', () => assert.throws(() => haversineNm({ lat: 0, lon: 0 }, { lat: 0, lon: 200 }), RangeError));
test('ref:haversine lat NaN throws TypeError', () => assert.throws(() => haversineNm({ lat: NaN, lon: 0 }, { lat: 0, lon: 0 }), TypeError));

// 4. etaMinutes
test('ref:eta 10NM @ 60kn = 10 min', () => assert.ok(near(etaMinutes(10, 60), 10)));
test('ref:eta 30NM @ 10kn = 180 min', () => assert.ok(near(etaMinutes(30, 10), 180)));
test('ref:eta vitesse 0 -> Infinity', () => assert.equal(etaMinutes(5, 0), Infinity));
test('ref:eta distance negative throws RangeError', () => assert.throws(() => etaMinutes(-1, 10), RangeError));
test('ref:eta vitesse negative throws RangeError', () => assert.throws(() => etaMinutes(10, -1), RangeError));
test('ref:eta NaN throws TypeError', () => assert.throws(() => etaMinutes(NaN, 10), TypeError));
