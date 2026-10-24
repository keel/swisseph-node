/**
 * Constants mirroring swephexp.h (planet ids, flags, house systems)
 * plus display metadata (glyphs, names with zh/en locales).
 */

// ---- flags -------------------------------------------------------------
const FLG = {
  SWIEPH: 2,
  MOSEPH: 4,
  SPEED: 256,
  RADIANS: 8192,
  TOPOCTR: 32 * 1024,
  SIDEREAL: 64 * 1024,
};
// Default flag set: Swiss Ephemeris files (falls back internally to Moshier
// when no data files are found) with speeds.
FLG.DEFAULT = FLG.SWIEPH | FLG.SPEED;

// SEFLG_ECL2HOR for swe_azalt
const ECL2HOR = 0;

// ---- bodies ------------------------------------------------------------
const BODIES = {
  SUN: 0, MOON: 1, MERCURY: 2, VENUS: 3, MARS: 4, JUPITER: 5, SATURN: 6,
  URANUS: 7, NEPTUNE: 8, PLUTO: 9, MEAN_NODE: 10, TRUE_NODE: 11,
  MEAN_APOG: 12, OSCU_APOG: 13, EARTH: 14, CHIRON: 15, CERES: 17,
  PALLAS: 18, JUNO: 19, VESTA: 20,
};

// id -> metadata. order = canonical chart order.
const PLANETS = [
  { id: 0,  key: 'sun',     glyph: '☉', color: '#f5b942' },
  { id: 1,  key: 'moon',    glyph: '☽', color: '#c9d6e8' },
  { id: 2,  key: 'mercury', glyph: '☿', color: '#9fd8e8' },
  { id: 3,  key: 'venus',   glyph: '♀', color: '#f2a6c0' },
  { id: 4,  key: 'mars',    glyph: '♂', color: '#ef7d64' },
  { id: 5,  key: 'jupiter', glyph: '♃', color: '#e8b98a' },
  { id: 6,  key: 'saturn',  glyph: '♄', color: '#cdb891' },
  { id: 7,  key: 'uranus',  glyph: '♅', color: '#8ee6d2' },
  { id: 8,  key: 'neptune', glyph: '♆', color: '#7ba7f2' },
  { id: 9,  key: 'pluto',   glyph: '♇', color: '#b58af2' },
  { id: 15, key: 'chiron',  glyph: '⚷', color: '#d8c9a3' },
  { id: 11, key: 'node',    glyph: '☊', color: '#a3d8b5' },
  { id: 17, key: 'ceres',   glyph: ' ⚳', color: '#c8b8a0' },
  { id: 18, key: 'pallas',  glyph: ' ⚴', color: '#a8c8e0' },
  { id: 19, key: 'juno',    glyph: ' ⚵', color: '#e0c0d0' },
  { id: 20, key: 'vesta',   glyph: ' ⚶', color: '#e8d8a8' },
];
const PLANET_BY_KEY = Object.fromEntries(PLANETS.map(p => [p.key, p]));

// ---- zodiac ------------------------------------------------------------
const SIGN_START = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const SIGN_ELEMENTS = ['fire', 'earth', 'air', 'water', 'fire', 'earth',
  'air', 'water', 'fire', 'earth', 'air', 'water'];
const SIGN_MODES = ['cardinal', 'fixed', 'mutable', 'cardinal', 'fixed', 'mutable',
  'cardinal', 'fixed', 'mutable', 'cardinal', 'fixed', 'mutable'];
const ELEMENT_COLORS = {
  fire: '#ef7d64', earth: '#b0a188', air: '#9fd8e8', water: '#7ba7f2',
};

// ---- aspects -----------------------------------------------------------
const ASPECTS = [
  { key: 'conjunction', angle: 0,   glyph: '☌', orb: 8,  color: '#f2c94c', nature: 'neutral' },
  { key: 'opposition',  angle: 180, glyph: '☍', orb: 8,  color: '#eb5757', nature: 'hard' },
  { key: 'trine',       angle: 120, glyph: '△', orb: 7,  color: '#6fcf97', nature: 'soft' },
  { key: 'square',      angle: 90,  glyph: '□', orb: 7,  color: '#eb5757', nature: 'hard' },
  { key: 'sextile',     angle: 60,  glyph: '✶', orb: 5,  color: '#56ccf2', nature: 'soft' },
  { key: 'quincunx',    angle: 150, glyph: '⚻', orb: 3,  color: '#bb6bd9', nature: 'hard' },
  { key: 'semisextile', angle: 30,  glyph: '⚺', orb: 2,  color: '#828fa3', nature: 'soft' },
  { key: 'semisquare',  angle: 45,  glyph: '∠', orb: 2,  color: '#d68f5e', nature: 'hard' },
  { key: 'sesquiquadrate', angle: 135, glyph: '⚼', orb: 2, color: '#d68f5e', nature: 'hard' },
  { key: 'quintile',    angle: 72,  glyph: 'Q',  orb: 2,  color: '#9b51e0', nature: 'soft' },
];

// ---- house systems -----------------------------------------------------
const HOUSE_SYSTEMS = [
  { code: 'P', key: 'placidus' },
  { code: 'K', key: 'koch' },
  { code: 'O', key: 'porphyry' },
  { code: 'R', key: 'regiomontanus' },
  { code: 'C', key: 'campanus' },
  { code: 'E', key: 'equal' },
  { code: 'W', key: 'wholeSign' },
  { code: 'A', key: 'alcabitius' },
  { code: 'T', key: 'polichPage' },
  { code: 'H', key: 'horizon' },
  { code: 'F', key: 'carter' },
];

// ---- house names (i18n keys) --------------------------------------------
const HOUSE_KEYS = [
  'self', 'wealth', 'communication', 'home', 'creativity', 'health',
  'partnership', 'transformation', 'philosophy', 'career', 'community', 'subconscious',
];

module.exports = {
  FLG, ECL2HOR, BODIES, PLANETS, PLANET_BY_KEY,
  SIGN_START, SIGN_KEYS, SIGN_GLYPHS, SIGN_ELEMENTS, SIGN_MODES, ELEMENT_COLORS,
  ASPECTS, HOUSE_SYSTEMS, HOUSE_KEYS,
};
