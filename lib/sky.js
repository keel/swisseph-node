/**
 * Sky map data: horizontal coordinates for planets + bright star catalog.
 */
const raw = require('../build/Release/swisseph_node.node');
const { FLG, BODIES } = require('./constants');
const { toUtc } = require('./chart');

const ecl2hor = 0; // SE_ECL2HOR

/** Convert ecliptic position to azimuth/altitude at a place & moment */
function azAltOf(jdUt, lonEcl, latEcl, geolat, geolon, alt = 0) {
  const r = raw.azAlt(jdUt, ecl2hor, [geolon, geolat, alt], 1013.25, 15,
    [lonEcl, latEcl, 1]);
  return { azimuth: r.azimuthTrue, altitude: r.altitude };
}

/** Equatorial -> horizontal for catalog stars (precession ignored: J2000, small error ok for a sky map) */
function starAzAlt(jdUt, raHours, decDeg, geolat, geolon) {
  const jdEt = jdUt + raw.deltat(jdUt) / 86400;
  const gmst = sweSiderealTime(jdUt);
  const lst = (gmst + geolon / 15 + 24) % 24; // hours
  const H = ((lst - raHours) * 15) * Math.PI / 180;
  const phi = geolat * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz = (Math.sin(dec) - Math.sin(phi) * sinAlt) / (Math.cos(phi) * Math.cos(alt) || 1e-9);
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(H) > 0) az = 2 * Math.PI - az;
  return { azimuth: az * 180 / Math.PI, altitude: alt * 180 / Math.PI };
}

/** Greenwich mean sidereal time in hours (IAU 1982) */
function sweSiderealTime(jdUt) {
  const T = (jdUt - 2451545.0) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jdUt - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000;
  return ((gmst % 360) + 360) % 360 / 15;
}

/**
 * Full sky snapshot for the sky map view.
 * @param dt {year,month,day,hour,minute} local; tz offset hours (or null => UTC)
 */
function computeSky({ year, month, day, hour = 0, minute = 0, tz = null, lat, lon, stars = true }) {
  const utc = toUtc({ year, month, day, hour, minute }, tz);
  const jdUt = raw.julDay(utc.year, utc.month, utc.day,
    utc.hour + utc.minute / 60, 1);

  const bodies = [];
  const keys = [
    ['sun', BODIES.SUN, '☉'], ['moon', BODIES.MOON, '☽'],
    ['mercury', BODIES.MERCURY, '☿'], ['venus', BODIES.VENUS, '♀'],
    ['mars', BODIES.MARS, '♂'], ['jupiter', BODIES.JUPITER, '♃'],
    ['saturn', BODIES.SATURN, '♄'], ['uranus', BODIES.URANUS, '♅'],
    ['neptune', BODIES.NEPTUNE, '♆'],
  ];
  for (const [key, id, glyph] of keys) {
    try {
      const p = raw.calcUt(jdUt, id, FLG.SWIEPH);
      const aa = azAltOf(jdUt, p.lon, p.lat, lat, lon);
      let extra = {};
      if (key === 'moon' || key === 'venus' || key === 'mercury' || key === 'mars') {
        try {
          const ph = raw.phenoUt(jdUt, id, FLG.SWIEPH);
          extra = { illumination: ph.phaseIllumination, magnitude: ph.apparentMagnitude };
        } catch (_) { /* fine */ }
      }
      bodies.push({ key, glyph, ...aa, eclLon: p.lon, ...extra });
    } catch (_) { /* skip missing body */ }
  }

  const starList = stars ? BRIGHT_STARS.map(s => {
    const aa = starAzAlt(jdUt, s.ra, s.dec, lat, lon);
    return { ...s, ...aa };
  }) : [];

  return {
    julianDay: jdUt,
    siderealTime: sweSiderealTime(jdUt),
    observer: { lat, lon },
    bodies,
    stars: starList,
    constellationLines: stars ? CONSTELLATION_LINES : [],
  };
}

/**
 * Bright star catalog (J2000). ra hours, dec degrees, magnitude, constellation.
 * Names in English; Chinese names included where common.
 */
const BRIGHT_STARS = [
  { n: 'Sirius', zh: '天狼星', ra: 6.7525, dec: -16.716, mag: -1.46, c: 'CMa' },
  { n: 'Canopus', zh: '老人星', ra: 6.3992, dec: -52.696, mag: -0.74, c: 'Car' },
  { n: 'Arcturus', zh: '大角星', ra: 14.2610, dec: 19.182, mag: -0.05, c: 'Boo' },
  { n: 'Rigil Kentaurus', zh: '南门二', ra: 14.6600, dec: -60.834, mag: -0.27, c: 'Cen' },
  { n: 'Vega', zh: '织女星', ra: 18.6156, dec: 38.784, mag: 0.03, c: 'Lyr' },
  { n: 'Capella', zh: '五车二', ra: 5.2782, dec: 45.998, mag: 0.08, c: 'Aur' },
  { n: 'Rigel', zh: '参宿七', ra: 5.2423, dec: -8.202, mag: 0.13, c: 'Ori' },
  { n: 'Procyon', zh: '南河三', ra: 7.6551, dec: 5.225, mag: 0.34, c: 'CMi' },
  { n: 'Achernar', zh: '水委一', ra: 1.6286, dec: -57.237, mag: 0.46, c: 'Eri' },
  { n: 'Betelgeuse', zh: '参宿四', ra: 5.9195, dec: 7.407, mag: 0.5, c: 'Ori' },
  { n: 'Hadar', zh: '马腹一', ra: 14.0637, dec: -60.373, mag: 0.61, c: 'Cen' },
  { n: 'Altair', zh: '牛郎星', ra: 19.8464, dec: 8.868, mag: 0.77, c: 'Aql' },
  { n: 'Acrux', zh: '十字架二', ra: 12.4433, dec: -63.099, mag: 0.76, c: 'Cru' },
  { n: 'Aldebaran', zh: '毕宿五', ra: 4.5987, dec: 16.509, mag: 0.85, c: 'Tau' },
  { n: 'Antares', zh: '心宿二', ra: 16.4901, dec: -26.432, mag: 0.96, c: 'Sco' },
  { n: 'Spica', zh: '角宿一', ra: 13.4199, dec: -11.161, mag: 0.97, c: 'Vir' },
  { n: 'Pollux', zh: '北河三', ra: 7.7553, dec: 28.026, mag: 1.14, c: 'Gem' },
  { n: 'Fomalhaut', zh: '北落师门', ra: 22.9608, dec: -29.622, mag: 1.16, c: 'PsA' },
  { n: 'Deneb', zh: '天津四', ra: 20.6905, dec: 45.280, mag: 1.25, c: 'Cyg' },
  { n: 'Mimosa', zh: '十字架三', ra: 12.7953, dec: -59.689, mag: 1.25, c: 'Cru' },
  { n: 'Regulus', zh: '轩辕十四', ra: 10.1395, dec: 11.967, mag: 1.35, c: 'Leo' },
  { n: 'Adhara', zh: '弧矢七', ra: 6.9771, dec: -28.972, mag: 1.5, c: 'CMa' },
  { n: 'Castor', zh: '北河二', ra: 7.5766, dec: 31.888, mag: 1.58, c: 'Gem' },
  { n: 'Gacrux', zh: '十字架一', ra: 12.5194, dec: -57.113, mag: 1.63, c: 'Cru' },
  { n: 'Shaula', zh: '尾宿八', ra: 17.5601, dec: -37.104, mag: 1.63, c: 'Sco' },
  { n: 'Bellatrix', zh: '参宿五', ra: 5.4188, dec: 6.350, mag: 1.64, c: 'Ori' },
  { n: 'Elnath', zh: '五车五', ra: 5.4382, dec: 28.608, mag: 1.65, c: 'Tau' },
  { n: 'Miaplacidus', zh: '南船五', ra: 9.2200, dec: -69.717, mag: 1.69, c: 'Car' },
  { n: 'Alnilam', zh: '参宿二', ra: 5.6036, dec: -1.202, mag: 1.69, c: 'Ori' },
  { n: 'Alnair', zh: '鹤一', ra: 22.1372, dec: -46.961, mag: 1.74, c: 'Gru' },
  { n: 'Alnitak', zh: '参宿一', ra: 5.6793, dec: -1.943, mag: 1.77, c: 'Ori' },
  { n: 'Alioth', zh: '玉衡', ra: 12.9005, dec: 55.960, mag: 1.77, c: 'UMa' },
  { n: 'Dubhe', zh: '天枢', ra: 11.0621, dec: 61.751, mag: 1.79, c: 'UMa' },
  { n: 'Mirfak', zh: '天船三', ra: 3.4054, dec: 49.861, mag: 1.80, c: 'Per' },
  { n: 'Wezen', zh: '弧矢一', ra: 7.1399, dec: -26.393, mag: 1.84, c: 'CMa' },
  { n: 'Kaus Australis', zh: '箕宿三', ra: 18.4029, dec: -34.385, mag: 1.85, c: 'Sgr' },
  { n: 'Alkaid', zh: '摇光', ra: 13.7923, dec: 49.313, mag: 1.86, c: 'UMa' },
  { n: 'Sargas', zh: '尾宿五', ra: 17.6220, dec: -42.998, mag: 1.87, c: 'Sco' },
  { n: 'Avior', zh: '海石一', ra: 8.3752, dec: -59.510, mag: 1.86, c: 'Car' },
  { n: 'Menkalinan', zh: '五车三', ra: 5.9921, dec: 44.947, mag: 1.90, c: 'Aur' },
  { n: 'Atria', zh: '三角形三', ra: 16.8111, dec: -69.028, mag: 1.91, c: 'TrA' },
  { n: 'Alhena', zh: '井宿三', ra: 6.6285, dec: 16.399, mag: 1.92, c: 'Gem' },
  { n: 'Peacock', zh: '孔雀十一', ra: 20.4275, dec: -56.735, mag: 1.94, c: 'Pav' },
  { n: 'Polaris', zh: '北极星', ra: 2.5303, dec: 89.264, mag: 1.98, c: 'UMi' },
  { n: 'Mirzam', zh: '军市一', ra: 6.3783, dec: -17.956, mag: 1.98, c: 'CMa' },
  { n: 'Alphard', zh: '星宿一', ra: 9.4598, dec: -8.659, mag: 1.98, c: 'Hya' },
  { n: 'Algieba', zh: '轩辕十二', ra: 10.3329, dec: 19.842, mag: 2.08, c: 'Leo' },
  { n: 'Hamal', zh: '娄宿三', ra: 2.1196, dec: 23.463, mag: 2.00, c: 'Ari' },
  { n: 'Deneb Kaitos', zh: '土司空', ra: 0.7265, dec: -17.987, mag: 2.04, c: 'Cet' },
  { n: 'Nunki', zh: '斗宿四', ra: 18.9211, dec: -26.297, mag: 2.05, c: 'Sgr' },
  { n: 'Menkent', zh: '库楼三', ra: 14.1114, dec: -36.370, mag: 2.06, c: 'Cen' },
  { n: 'Alpheratz', zh: '壁宿二', ra: 0.1398, dec: 29.091, mag: 2.06, c: 'And' },
  { n: 'Mirach', zh: '奎宿九', ra: 1.1622, dec: 35.621, mag: 2.05, c: 'And' },
  { n: 'Rasalhague', zh: '侯', ra: 17.5822, dec: 12.560, mag: 2.07, c: 'Oph' },
  { n: 'Kochab', zh: '北极二', ra: 14.8451, dec: 74.156, mag: 2.08, c: 'UMi' },
  { n: 'Saiph', zh: '参宿六', ra: 5.7959, dec: -9.670, mag: 2.09, c: 'Ori' },
  { n: 'Denebola', zh: '五帝座一', ra: 11.8177, dec: 14.572, mag: 2.14, c: 'Leo' },
  { n: 'Algol', zh: '大陵五', ra: 3.1361, dec: 40.956, mag: 2.12, c: 'Per' },
  { n: 'Tiaki', zh: '尾宿二', ra: 17.0124, dec: -43.134, mag: 2.08, c: 'Sco' },
  { n: 'Muhlifain', zh: '天社一', ra: 12.6921, dec: -48.960, mag: 2.20, c: 'Cen' },
  { n: 'Aspidiske', zh: '海石二', ra: 9.2850, dec: -59.275, mag: 2.25, c: 'Car' },
  { n: 'Suhail', zh: '天记', ra: 9.1335, dec: -43.433, mag: 2.23, c: 'Vel' },
  { n: 'Alphecca', zh: '贯索四', ra: 15.5781, dec: 26.715, mag: 2.23, c: 'CrB' },
  { n: 'Mizar', zh: '开阳', ra: 13.3988, dec: 54.926, mag: 2.23, c: 'UMa' },
  { n: 'Sadr', zh: '天津一', ra: 20.3705, dec: 40.257, mag: 2.23, c: 'Cyg' },
  { n: 'Schedar', zh: '王良四', ra: 0.6750, dec: 56.537, mag: 2.24, c: 'Cas' },
  { n: 'Eltanin', zh: '天棓四', ra: 17.9434, dec: 51.489, mag: 2.23, c: 'Dra' },
  { n: 'Caph', zh: '王良一', ra: 0.1530, dec: 59.150, mag: 2.28, c: 'Cas' },
  { n: 'Izar', zh: '梗河一', ra: 14.7498, dec: 27.074, mag: 2.37, c: 'Boo' },
  { n: 'Dschubba', zh: '房宿四', ra: 16.0056, dec: -22.622, mag: 2.29, c: 'Sco' },
  { n: 'Larawag', zh: '尾宿三', ra: 16.8361, dec: -34.293, mag: 2.29, c: 'Sco' },
  { n: 'Ruchbah', zh: '王良七', ra: 1.4303, dec: 60.235, mag: 2.68, c: 'Cas' },
  { n: 'CentaurusX', zh: '库楼七', ra: 14.6465, dec: -47.288, mag: 2.30, c: 'Cen' },
  { n: 'Markab', zh: '室宿一', ra: 23.0793, dec: 15.205, mag: 2.49, c: 'Peg' },
  { n: 'Scheat', zh: '室宿二', ra: 23.0629, dec: 28.083, mag: 2.42, c: 'Peg' },
  { n: 'Enif', zh: '危宿三', ra: 21.7364, dec: 9.875, mag: 2.38, c: 'Peg' },
  { n: 'Algenib', zh: '壁宿一', ra: 0.2210, dec: 15.184, mag: 2.83, c: 'Peg' },
  { n: 'CaphBeta', zh: '', ra: 0.15, dec: 59.1, mag: 2.3, c: 'Cas' },
  { n: 'Megrez', zh: '天权', ra: 12.2571, dec: 57.033, mag: 3.31, c: 'UMa' },
  { n: 'Phecda', zh: '天璇', ra: 11.8972, dec: 53.695, mag: 2.44, c: 'UMa' },
  { n: 'Merak', zh: '天玑', ra: 11.0307, dec: 56.382, mag: 2.37, c: 'UMa' },
  { n: 'Alioth2', zh: '', ra: 12.9, dec: 56.0, mag: 3.0, c: 'UMa' },
];

/** Constellation stick figures as pairs of star names. */
const CONSTELLATION_LINES = [
  // Orion
  ['Betelgeuse', 'Alnitak'], ['Alnitak', 'Alnilam'], ['Alnilam', 'Alnitak'],
  ['Alnilam', 'Mintaka'], ['Mintaka', 'Rigel'], ['Mintaka', 'Alnilam'],
  ['Betelgeuse', 'Bellatrix'], ['Bellatrix', 'Rigel'], ['Bellatrix', 'Saiph'], ['Saiph', 'Rigel'], ['Alnitak', 'Saiph'],
  // Ursa Major (Big Dipper)
  ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'],
  ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'],
  // Cassiopeia
  ['Caph', 'Schedar'], ['Schedar', 'GammaCas'], ['GammaCas', 'Ruchbah'],
  // Cygnus
  ['Deneb', 'Sadr'], ['GienahCyg', 'Sadr'], ['Sadr', 'DeltaCyg'], ['DeltaCyg', 'Albireo'],
  // Scorpius
  ['Dschubba', 'Antares'], ['Antares', 'Larawag'], ['Larawag', 'Tiaki'], ['Tiaki', 'Sargas'], ['Sargas', 'Shaula'],
  // Crux
  ['Acrux', 'Gacrux'], ['Mimosa', 'DeltaCru'],
  // Centaurus
  ['Rigil Kentaurus', 'Hadar'],
  // Canis Major
  ['Sirius', 'Mirzam'], ['Sirius', 'Adhara'], ['Sirius', 'Wezen'], ['Wezen', 'Adhara'], ['Wezen', 'Aludra'],
  // Gemini
  ['Castor', 'Pollux'], ['Castor', 'Alhena'], ['Pollux', 'Alhena'],
  // Leo
  ['Regulus', 'Algieba'], ['Algieba', 'Zosma'], ['Zosma', 'Denebola'], ['Denebola', 'Zosma'], ['Regulus', 'EtaLeo'], ['EtaLeo', 'Zosma'], ['Denebola', 'EtaLeo'],
  // Taurus (V + horns)
  ['Aldebaran', 'Elnath'], ['Aldebaran', 'TauPsi'],
  // Perseus
  ['Mirfak', 'Algol'],
  // Aquila
  ['Altair', 'Tarazed'], ['Altair', 'Alshain'],
  // Lyra
  ['Vega', 'Sheliak'], ['Sheliak', 'Sulafat'], ['Vega', 'DeltaLyr'],
  // Bootes
  ['Arcturus', 'Izar'], ['Arcturus', 'EpsilonBoo2'], ['Izar', 'Muphrid'],
  // Virgo
  ['Spica', 'Porrima'], ['Porrima', 'Vindemiatrix'],
  // Aries
  ['Hamal', 'Sheratan'],
  // Andromeda
  ['Alpheratz', 'Mirach'], ['Mirach', 'Almach'],
  // Pegasus square
  ['Markab', 'Scheat'], ['Scheat', 'Alpheratz'], ['Alpheratz', 'Algenib'], ['Algenib', 'Markab'], ['Markab', 'Enif'],
].map(([a, b]) => ({ a, b }))
  // drop lines whose endpoints are not in catalog
  .filter(l => {
    const names = new Set(BRIGHT_STARS.map(s => s.n));
    return names.has(l.a) && names.has(l.b);
  });

module.exports = { computeSky, azAltOf, starAzAlt, sweSiderealTime, BRIGHT_STARS, CONSTELLATION_LINES };
