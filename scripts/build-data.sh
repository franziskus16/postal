#!/usr/bin/env bash
# Genera les bústies d'un país a partir d'OSM, partides en tessel·les:
#   public/data/<país>/index.json + public/data/<país>/<x>_<y>.json
# Ús:  bash scripts/build-data.sh es   |   pt   |   fr
#      (CLEAN=1 esborra els mapes descarregats en acabar; útil a GitHub Actions)
# Requereix osmium-tool:  brew install osmium-tool   |   sudo apt install osmium-tool
set -euo pipefail

command -v osmium >/dev/null || { echo "Falta osmium: brew install osmium-tool"; exit 1; }

COUNTRY="${1:-es}"
WORK="${WORK:-.osm-cache}"
mkdir -p "$WORK" public/data

# Extractes de Geofabrik per país, en format "nom|url".
# Les illes que Geofabrik té a part s'hi afegeixen; els duplicats s'eliminen per id.
# (Sense arrays associatius: el bash de macOS és la 3.2.)
case "$COUNTRY" in
  es)
    EXTRACTS=(
      "spain|https://download.geofabrik.de/europe/spain-latest.osm.pbf"
      "canarias|https://download.geofabrik.de/africa/canary-islands-latest.osm.pbf"
    ) ;;
  pt)
    EXTRACTS=(
      "portugal|https://download.geofabrik.de/europe/portugal-latest.osm.pbf"
      "azores|https://download.geofabrik.de/europe/azores-latest.osm.pbf"
    ) ;;
  fr)
    # França metropolitana (Còrsega inclosa)
    EXTRACTS=(
      "france|https://download.geofabrik.de/europe/france-latest.osm.pbf"
    ) ;;
  *)
    echo "País desconegut: $COUNTRY (de moment: es, pt, fr)"; exit 1 ;;
esac

INPUTS=()
for entry in "${EXTRACTS[@]}"; do
  name="${entry%%|*}"
  url="${entry#*|}"
  pbf="$WORK/$name.osm.pbf"
  echo "↓ $name"
  # Geofabrik de vegades rebutja connexions puntualment: reintentem uns quants cops
  RETRY=(--retry 6 --retry-delay 20 --retry-all-errors --connect-timeout 30)
  if [ -f "$pbf" ]; then
    curl -fL "${RETRY[@]}" -z "$pbf" -o "$pbf" "$url"   # -z: només si hi ha versió nova
  else
    curl -fL "${RETRY[@]}" -o "$pbf" "$url"
  fi

  echo "⚙ filtrant bústies ($name)"
  osmium tags-filter "$pbf" n/amenity=post_box -o "$WORK/$name-pb.osm.pbf" --overwrite
  osmium export "$WORK/$name-pb.osm.pbf" -f geojson --add-unique-id=type_id \
    -o "$WORK/$name-pb.geojson" --overwrite
  INPUTS+=("$WORK/$name-pb.geojson")
  if [ "${CLEAN:-0}" = "1" ]; then rm -f "$pbf"; fi   # el mapa sencer ja no cal
done

node scripts/tiles.mjs "$COUNTRY" "${INPUTS[@]}"
rm -f "public/data/busties-$COUNTRY.geojson"   # format antic (un sol fitxer per país)
