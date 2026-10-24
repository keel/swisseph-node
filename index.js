/**
 * swisseph-node entry point.
 *
 * Low level: require('swisseph-node').raw  (faithful C API mapping)
 * High level: computeChart / computeSynastry / computeSky
 */
const raw = require('./build/Release/swisseph_node.node');
const chart = require('./lib/chart');
const sky = require('./lib/sky');
const { FLG, PLANETS, SIGN_KEYS, SIGN_GLYPHS, ASPECTS, HOUSE_SYSTEMS, BODIES } = require('./lib/constants');
const aspectsLib = require('./lib/aspects');

// auto-configure ephemeris path on first high-level call
chart.initEphe();

module.exports = {
  raw,
  FLG, BODIES, PLANETS, SIGN_KEYS, SIGN_GLYPHS, ASPECTS, HOUSE_SYSTEMS,
  ...chart,      // computeChart, computeSynastry, setEphePath alias below
  ...aspectsLib, // angularSeparation, findAspect, computeAspects
  ...sky,        // computeSky, BRIGHT_STARS, CONSTELLATION_LINES
  setEphePath: (p) => raw.setEphePath(p),
};
