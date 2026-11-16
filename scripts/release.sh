#!/bin/bash
# Builds Incrementalography for Mac and Windows and publishes it on GitHub Releases.
# The download page (site/index.html) links to releases/latest, so it always offers the newest one.
# Before running it, raise the version in package.json (for example 1.0.1).
set -euo pipefail
cd "$(dirname "$0")/.."
V=$(node -p "require('./package.json').version")
FILES=(release/Incrementalography-Mac.dmg release/Incrementalography-Setup-Windows.exe release/Incrementalography-Portable-Windows.exe)

if [ "${SKIP_BUILD:-}" != "1" ]; then
  rm -rf release
  npm run humo
  npm run build:app
fi

if gh release view "v$V" >/dev/null 2>&1; then
  echo "v$V already exists: replacing its files."
  gh release upload "v$V" "${FILES[@]}" --clobber
else
  gh release create "v$V" "${FILES[@]}" --title "Incrementalography $V" \
    --notes "Download page: https://pepe-a-d.github.io/incrementalography/ · Mac (Apple Silicon): Incrementalography-Mac.dmg · Windows: Incrementalography-Setup-Windows.exe, or the portable one"
fi
echo "Published: https://github.com/Pepe-a-d/incrementalography/releases/tag/v$V"
