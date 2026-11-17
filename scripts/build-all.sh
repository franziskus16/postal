#!/usr/bin/env bash
# Genera les bústies de tots els països de POSTAL.
# Per afegir un país: afegeix-lo aquí i a scripts/build-data.sh (no cal tocar el workflow).
set -euo pipefail
for country in es pt fr; do
  bash scripts/build-data.sh "$country"
done
