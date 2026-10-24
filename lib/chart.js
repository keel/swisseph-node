/**
 * High-level chart computation on top of the raw binding.
 */
const path = require('path');
const fs = require('fs');
const raw = require('../build/Release/swisseph_node.node');
const {
  FLG, PLANETS, SIGN_KEYS, SIGN_GLYPHS, SIGN_ELEMENTS, SIGN_MODES,
  HOUSE_SYSTEMS, HOUSE_KEYS,
} = require('./constants');
const { computeAspects } = require('./aspects');

const DEFAULT_PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
  'uranus', 'neptune', 'pluto', 'chiron', 'node',
];

let epheConfigured = false;

/**
 * Point Swiss Ephemeris at a data directory. Called automatically with
 * env SWISSEPH_EPHE_PATH or the repo-local ../swisseph-master/ephe.
 */
function initEphe(explicitPath) {
  if (epheConfigured && !explicitPath) return;
  const candidates = [
    explicitPath,
    process.env.SWISSEPH_EPHE_PATH,
    path.resolve(__dirname, '../../swisseph-master/ephe'),
    path.resolve(__dirname, '../swisseph-master/ephe'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) { raw.setEphePath(p); break; }
  }
  epheConfigured = true;
}

/** Normalize local datetime + tz offset to UTC fields */
function toUtc(dt, tzOffsetHours) {
  if (tzOffsetHours == null) {
    return { year: dt.year, month: dt.month, day: dt.day,
      hour: dt.hour || 0, minute: dt.minute || 0, second: dt.second || 0 };
  }
  return raw.utcTimeZone(dt.year, dt.month, dt.day,
    dt.hour || 0, dt.minute || 0, dt.second || 0, tzOffsetHours);
}

function normalizeLon(l) { return ((l % 360) + 360) % 360; }

/** Which house (1..12) does a longitude fall in, given 12 cusps */
function houseOf(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    const span = normalizeLon(b - a) || 360;
    const rel = normalizeLon(lon - a);
    if (rel < span) return i + 1;
  }
  return 12;
}

function formatDms(lon) {
  const l = normalizeLon(lon);
  const deg = Math.floor(l);
  const minF = (l - deg) * 60;
  const min = Math.floor(minF);
  const sec = Math.round((minF - min) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(2, '0')}"`;
}

/**
 * Compute a full natal (or event) chart.
 *
 * @param {Object} input
 *   year, month, day, hour, minute, second (local time)
 *   tz: timezone offset hours east of GMT (e.g. 8 for CST). Omit if fields are already UTC.
 *   lat, lon: geographic (north/east positive)
 *   houseSystem: letter code, default 'P' (Placidus)
 *   planets: array of planet keys, default 10 + chiron + node
 *   aspects: boolean (default true)
 *   flags: extra SEFLG bits (e.g. SIDEREAL)
 */
function computeChart(input) {
  const {
    year, month, day, hour = 0, minute = 0, second = 0, tz = null,
    lat, lon, houseSystem = 'P',
    planets = DEFAULT_PLANETS, aspects = true, flags = 0,
  } = input;
  initEphe();

  const utc = toUtc({ year, month, day, hour, minute, second }, tz);
  const jdUt = raw.julDay(utc.year, utc.month, utc.day,
    utc.hour + utc.minute / 60 + utc.second / 3600, 1 /* SE_GREG_CAL */);
  const iflag = FLG.DEFAULT | flags;

  const hs = HOUSE_SYSTEMS.find(h => h.code === houseSystem.toUpperCase())
    ? houseSystem.toUpperCase() : 'P';
  const h = raw.houses(jdUt, lat, lon, hs, iflag);
  const cusps = h.cusps.slice(0, 12).map(normalizeLon);
  const ascmc = h.ascmc;

  const bodies = planets
    .map(key => PLANETS.find(p => p.key === key))
    .filter(Boolean)
    .map(p => {
      let pos;
      try {
        pos = raw.calcUt(jdUt, p.id, iflag);
      } catch (e) {
        // Missing ephemeris file for minor body — skip rather than fail the chart.
        return null;
      }
      const lonAbs = normalizeLon(pos.lon);
      const signIndex = Math.floor(lonAbs / 30);
      return {
        id: p.id, key: p.key, glyph: p.glyph.trim(), color: p.color,
        lon: lonAbs,
        lonFormatted: formatDms(lonAbs),
        lat: pos.lat,
        distance: pos.dist,
        speed: pos.lonSpeed,
        retrograde: pos.lonSpeed < 0,
        sign: SIGN_KEYS[signIndex],
        signIndex,
        signGlyph: SIGN_GLYPHS[signIndex],
        element: SIGN_ELEMENTS[signIndex],
        mode: SIGN_MODES[signIndex],
        degreeInSign: Number((lonAbs % 30).toFixed(4)),
        house: houseOf(lonAbs, cusps),
        isAngle: false,
      };
    })
    .filter(Boolean);

  const angles = [
    { key: 'asc', glyph: 'AC', lon: normalizeLon(ascmc[0]), label: 'Ascendant' },
    { key: 'mc', glyph: 'MC', lon: normalizeLon(ascmc[1]), label: 'Midheaven' },
    { key: 'dsc', glyph: 'DC', lon: normalizeLon(ascmc[0] + 180), label: 'Descendant' },
    { key: 'ic', glyph: 'IC', lon: normalizeLon(ascmc[1] + 180), label: 'ImumCoeli' },
  ].map(a => {
    const signIndex = Math.floor(a.lon / 30);
    return { ...a, isAngle: true, id: -1,
      sign: SIGN_KEYS[signIndex], signIndex, signGlyph: SIGN_GLYPHS[signIndex],
      element: SIGN_ELEMENTS[signIndex], mode: SIGN_MODES[signIndex],
      degreeInSign: Number((a.lon % 30).toFixed(4)),
      lonFormatted: formatDms(a.lon) };
  });

  const aspectList = aspects
    ? computeAspects(bodies.map(b => ({ key: b.key, lon: b.lon })))
    : [];

  // element / mode balances
  const elements = { fire: 0, earth: 0, air: 0, water: 0 };
  const modes = { cardinal: 0, fixed: 0, mutable: 0 };
  const weights = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2 };
  for (const b of bodies) {
    const w = weights[b.key] || 1;
    elements[b.element] += w;
    modes[b.mode] += w;
  }

  return {
    input: { ...input, computedUtc: utc },
    julianDay: jdUt,
    deltaT: raw.deltat(jdUt),
    ayanamsa: raw.ayanamsaUt(jdUt),
    houseSystem: hs,
    houses: {
      cusps,
      cuspsFormatted: cusps.map(formatDms),
      keys: HOUSE_KEYS,
      ascendant: angles[0],
      midheaven: angles[1],
      vertex: normalizeLon(ascmc[3]),
    },
    planets: bodies,
    angles,
    aspects: aspectList,
    balances: { elements, modes },
    version: raw.version(),
  };
}

/**
 * Synastry: two charts plus cross-aspects.
 */
function computeSynastry(a, b, opts = {}) {
  const chartA = computeChart({ ...a, aspects: false });
  const chartB = computeChart({ ...b, aspects: false });
  const cross = [];
  const bodiesA = chartA.planets;
  const bodiesB = chartB.planets;
  const { findAspect } = require('./aspects');
  for (const pa of bodiesA) {
    for (const pb of bodiesB) {
      const asp = findAspect(pa.lon, pb.lon, opts);
      if (asp) cross.push({ a: pa.key, b: pb.key, ...asp });
    }
  }
  cross.sort((x, y) => x.orbDelta - y.orbDelta);
  // house overlays: B's planets in A's houses and vice versa
  const overlay = (chart, others) => others.map(p => ({ ...p, house: houseOf(p.lon, chart.houses.cusps) }));
  return {
    a: chartA, b: chartB,
    crossAspects: cross,
    aHousesOfB: overlay(chartA, chartB.planets),
    bHousesOfA: overlay(chartB, chartA.planets),
  };
}

module.exports = { initEphe, computeChart, computeSynastry, toUtc, houseOf, formatDms, normalizeLon };
