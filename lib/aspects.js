/**
 * Aspect calculation between ecliptic longitudes.
 */
const { ASPECTS } = require('./constants');

/** Smallest angular separation of two ecliptic longitudes, 0..180 */
function angularSeparation(a, b) {
  let d = Math.abs(((a - b) % 360 + 360) % 360);
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Find the aspect (if any) between two longitudes using per-aspect orbs.
 * Optionally tighten orbs for fast bodies.
 * @returns {{key,angle,orbDelta,nature,glyph,color}|null}
 */
function findAspect(lon1, lon2, opts = {}) {
  const baseOrbs = opts.orbs || null;
  const sep = angularSeparation(lon1, lon2);
  let best = null;
  let bestDelta = Infinity;
  for (const a of ASPECTS) {
    const orb = (baseOrbs && typeof baseOrbs[a.key] === 'number') ? baseOrbs[a.key] : a.orb;
    const delta = Math.abs(sep - a.angle);
    if (delta <= orb && delta < bestDelta) {
      best = a;
      bestDelta = delta;
    }
  }
  if (!best) return null;
  return {
    key: best.key, angle: best.angle, orbDelta: Number(bestDelta.toFixed(4)),
    nature: best.nature, glyph: best.glyph, color: best.color,
  };
}

/**
 * Compute all aspects among a list of bodies.
 * @param {Array<{key:string,lon:number}>} bodies
 * @param {Object} opts { orbs, maxOrb } — maxOrb caps default orbs.
 * @returns {Array<{a,b,aspect}>}
 */
function computeAspects(bodies, opts = {}) {
  const out = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const aspect = findAspect(bodies[i].lon, bodies[j].lon, opts);
      if (aspect) {
        out.push({ a: bodies[i].key, b: bodies[j].key, aspect });
      }
    }
  }
  // strongest (tightest) first
  out.sort((x, y) => x.aspect.orbDelta - y.aspect.orbDelta);
  return out;
}

module.exports = { angularSeparation, findAspect, computeAspects };
