/** Basic verification against known Swiss Ephemeris reference values. */
const assert = require('assert');
const swe = require('..');

const near = (a, b, tol, msg) => {
  const d = Math.abs(a - b);
  assert.ok(d <= tol, `${msg}: got ${a}, expected ~${b} (±${tol})`);
};

// Ephemeris files are optional (e.g. CI / clean checkouts): without them the
// binding falls back to Moshier and minor bodies (chiron) are skipped.
const probe = swe.computeChart({
  year: 2000, month: 1, day: 1, hour: 20, tz: 8, lat: 39.9, lon: 116.4, houseSystem: 'P',
});
const EPHE_AVAILABLE = probe.planets.some(p => p.key === 'chiron');
const PLANET_COUNT = EPHE_AVAILABLE ? 12 : 11;

let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.error(`  ✗ ${name}\n    ${e.message}`); }
};

console.log(`swisseph-node tests (SE ${swe.raw.version()}, ephe files: ${EPHE_AVAILABLE ? 'yes' : 'no — Moshier fallback'})`);

// Reference values generated with upstream swetest (SE 2.10.03, ephe/ files):
//   swetest -b1.1.2000 -ut12 -p0 -fL -eswe -edir../swisseph-master/ephe
// Sun   apparent longitude 280°22'08.1072 = 280.3689186
// Moon  apparent longitude 223°19'25.5052 = 223.3237514
// ASC (116.4074E, 39.9042N, Placidus) = 137°49'22.3220 = 137.8228672
test('sun longitude 2000-01-01 12:00 UT = 280.3689186 (swetest ref)', () => {
  const jd = swe.raw.julDay(2000, 1, 1, 12.0, 1);
  const p = swe.raw.calcUt(jd, swe.BODIES.SUN, swe.FLG.SWIEPH | swe.FLG.SPEED);
  near(p.lon, 280.3689186, 0.001, 'sun lon');
  assert.ok(p.lonSpeed > 1.0 && p.lonSpeed < 1.1, `sun speed ${p.lonSpeed}`);
});

// Moon 2000-01-01 12:00 UT
test('moon longitude 2000-01-01 12:00 UT = 223.3237514 (switest ref)', () => {
  const jd = swe.raw.julDay(2000, 1, 1, 12.0, 1);
  const p = swe.raw.calcUt(jd, swe.BODIES.MOON, swe.FLG.SWIEPH);
  near(p.lon, 223.3237514, 0.001, 'moon lon');
});

test('julian day 2000-01-01 12 UT = 2451545.0', () => {
  const jd = swe.raw.julDay(2000, 1, 1, 12.0, 1);
  near(jd, 2451545.0, 1e-9, 'jd');
});

test('utc timezone conversion (+8)', () => {
  const utc = swe.raw.utcTimeZone(2000, 1, 1, 20, 0, 0, 8);
  assert.strictEqual(utc.year, 2000);
  assert.strictEqual(utc.hour, 12);
});

test('houses: Beijing 2000-01-01 12UT Placidus ASC sanity', () => {
  const jd = swe.raw.julDay(2000, 1, 1, 12.0, 1);
  const h = swe.raw.houses(jd, 39.9042, 116.4074, 'P', 0);
  assert.strictEqual(h.cusps.length, 12);
  near(h.ascmc[0], 137.8228672, 0.001, 'ASC');
});

test('computeChart structure', () => {
  const c = swe.computeChart({
    year: 2000, month: 1, day: 1, hour: 20, tz: 8,
    lat: 39.9042, lon: 116.4074, houseSystem: 'P',
  });
  assert.strictEqual(c.planets.length, PLANET_COUNT);
  const sun = c.planets.find(p => p.key === 'sun');
  near(sun.lon, 280.3689186, 0.002, 'chart sun lon');
  assert.ok(sun.sign === 'capricorn');
  assert.ok(sun.house >= 1 && sun.house <= 12);
  assert.ok(c.aspects.length > 0);
  assert.ok(c.houses.cusps.length === 12);
  assert.ok(c.julianDay > 2451544 && c.julianDay < 2451546);
});

test('aspects: exact conjunction detected with 0 orb', () => {
  const a = swe.findAspect(10, 10.5);
  assert.strictEqual(a.key, 'conjunction');
  near(a.orbDelta, 0.5, 1e-9, 'orb');
  assert.strictEqual(swe.findAspect(10, 100).key, 'square'); // exact 90°
  assert.strictEqual(swe.findAspect(10, 112), null);          // 102° sep, out of orb
});

test('synastry returns cross aspects', () => {
  const s = swe.computeSynastry(
    { year: 1990, month: 6, day: 15, hour: 14, tz: 8, lat: 31.23, lon: 121.47 },
    { year: 1992, month: 2, day: 3, hour: 6, tz: 8, lat: 39.90, lon: 116.40 });
  assert.ok(s.a.planets.length === PLANET_COUNT);
  assert.ok(Array.isArray(s.crossAspects));
  assert.ok(s.crossAspects.length > 0);
});

test('sky: planets have azimuth/altitude', () => {
  const sky = swe.computeSky({
    year: 2026, month: 10, day: 24, hour: 21, tz: 8, lat: 39.9, lon: 116.4 });
  assert.ok(sky.bodies.length >= 9);
  for (const b of sky.bodies) {
    assert.ok(b.azimuth >= 0 && b.azimuth < 360, `az ${b.azimuth}`);
    assert.ok(b.altitude >= -90 && b.altitude <= 90, `alt ${b.altitude}`);
  }
  assert.ok(sky.stars.length > 50);
});

test('chiron & asteroids need ephe files; chart still works', () => {
  const c = swe.computeChart({
    year: 1990, month: 6, day: 15, hour: 14, tz: 8, lat: 31.23, lon: 121.47,
    planets: ['sun', 'chiron', 'ceres'],
  });
  assert.ok(c.planets.length >= 1);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests passed');
