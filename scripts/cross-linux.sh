#!/usr/bin/env bash
# Cross-compile the native addon for old-glibc Linux (2.17) using zig as the
# toolchain. Produces prebuilds/linux-x64/ and/or prebuilds/linux-arm64/.
#
# Why: CI's ubuntu-latest (glibc 2.39) binaries fail to load on EdgeOne's SCF
# runtime (older glibc): "GLIBC_2.38 not found". Pinning the target to
# glibc 2.17 makes the binary load on essentially every Linux still running.
#
# Usage: scripts/cross-linux.sh <zig-binary> <x64|arm64> [node-version]
# Requires: node headers (auto-downloaded), node-addon-api (npm install).
set -euo pipefail

ZIG="${1:?usage: cross-linux.sh <zig> <x64|arm64> [node-version]}"
ARCH="${2:?usage: cross-linux.sh <zig> <x64|arm64> [node-version]}"
NODE_VER="${3:-20.19.3}"

cd "$(dirname "$0")/.."

case "$ARCH" in
  x64)   TRIPLE="x86_64-linux-gnu.2.17"; PLAT="linux-x64" ;;
  arm64) TRIPLE="aarch64-linux-gnu.2.17"; PLAT="linux-arm64" ;;
  *) echo "bad arch: $ARCH"; exit 1 ;;
esac

# --- node headers ---
HDR="build/node-headers/$NODE_VER"
if [ ! -f "$HDR/include/node/node_api.h" ]; then
  mkdir -p "build/node-headers"
  curl -fsSL "https://nodejs.org/download/release/v$NODE_VER/node-v$NODE_VER-headers.tar.gz" \
    | tar -xz -C "build/node-headers"
fi

INC="-Ivendor -Isrc -Inode_modules/node-addon-api -I$HDR/include/node"
DEFS="-DNAPI_DISABLE_CPP_EXCEPTIONS -DNAPI_VERSION=8"
CFLAGS="-target $TRIPLE -O2 -fPIC $DEFS $INC"

echo "[cross-linux] $PLAT ($TRIPLE)"

mkdir -p "build/cross-$PLAT/obj" "prebuilds/$PLAT"
OBJS=""

# C sources (same list as binding.gyp)
for f in sweph swedate swehouse swejpl swemmoon swemplan swecl swehel swephlib; do
  o="build/cross-$PLAT/obj/$f.o"
  "$ZIG" cc $CFLAGS -c "vendor/$f.c" -o "$o"
  OBJS="$OBJS $o"
done

# C++ addon
o="build/cross-$PLAT/obj/addon.o"
"$ZIG" c++ $CFLAGS -std=c++17 -c src/addon.cc -o "$o"
OBJS="$OBJS $o"

# link
OUT="prebuilds/$PLAT/swisseph-node.node"
"$ZIG" c++ -target $TRIPLE -shared -o "$OUT" $OBJS
"$ZIG" objcopy --strip-all "$OUT" 2>/dev/null || true

echo "[cross-linux] wrote $OUT ($(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT") bytes)"

# sanity: max required GLIBC version must be <= 2.17
MAXGLIBC=$(strings "$OUT" | grep -o 'GLIBC_2\.[0-9]*' | sort -uV | tail -1 || true)
echo "[cross-linux] max required glibc symbol: ${MAXGLIBC:-none}"
if [ -n "$MAXGLIBC" ] && [ "$MAXGLIBC" != "$(printf '%s\nGLIBC_2.17' "$MAXGLIBC" | sort -V | head -1)" ]; then
  echo "[cross-linux] ERROR: requires $MAXGLIBC > 2.17"; exit 1
fi

node scripts/gen-b64.js
