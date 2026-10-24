/**
 * Single source of truth for loading the native swisseph_node binary.
 *
 * Loading order (first match wins):
 *   1. prebuilds/<platform>-<arch>/swisseph-node.node  (prebuildify, shipped in npm tarball)
 *   2. build/Release/swisseph_node.node                (local `npm run build`)
 *   3. lib/b64/<platform>-<arch>.js                    (base64-embedded binary; decoded to
 *      os.tmpdir() at first use) — survives bundlers like esbuild that inline all JS
 *      into a single file with no node_modules on disk (e.g. EdgeOne Cloud Functions).
 *
 * All internal modules must require the addon through this file — never
 * require('../build/Release/...') directly, which breaks in bundled environments.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

let cached = null;

function tryRequire(p, onErr) {
  try { return require(p); } catch (e) { if (onErr) onErr(e); return null; }
}

function loadRaw() {
  if (cached) return cached;

  const pkg = require('../package.json');
  const plat = process.platform + '-' + process.arch;
  let detail = null;
  let m;

  // Bundled-ESM environments have no __dirname — only the prebuilds/build
  // lookups need it; the base64 fallback below works without any filesystem
  // location at all.
  if (typeof __dirname !== 'undefined') {
    const root = path.join(__dirname, '..');

    // 1. prebuildify layout
    m = tryRequire(path.join(root, 'prebuilds', plat, 'swisseph-node.node'));
    if (m) return (cached = m);

    // 2. local node-gyp build
    m = tryRequire(path.join(root, 'build', 'Release', 'swisseph_node.node'));
    if (m) return (cached = m);
  }

  // 3. base64-embedded fallback (bundle-only environments).
  //    NOTE: static requires only — computed paths are invisible to bundlers.
  try {
    const B64 = {
      'linux-x64': () => require('./b64/linux-x64.js'),
      'linux-arm64': () => require('./b64/linux-arm64.js'),
      'darwin-x64': () => require('./b64/darwin-x64.js'),
      'darwin-arm64': () => require('./b64/darwin-arm64.js'),
    };
    const b64 = B64[plat] && B64[plat]();
    if (b64) {
      const tmp = path.join(os.tmpdir(), `swisseph_node-${pkg.version}-${process.pid}.node`);
      fs.writeFileSync(tmp, Buffer.from(b64, 'base64'));
      m = tryRequire(tmp, (e) => { detail = 'embedded load failed: ' + ((e && e.message) || e); });
      if (m) return (cached = m);
    } else {
      detail = 'embedded payload for ' + plat + ' is a placeholder (not built on this platform)';
    }
  } catch (e) {
    detail = (e && e.message) || String(e);
  }

  throw new Error(
    'swisseph-node: no native binary for ' + plat +
    (detail ? ' (' + detail + ')' : '') +
    '. Run `npm rebuild swisseph-node` to compile from the vendored sources.'
  );
}

module.exports = loadRaw();
