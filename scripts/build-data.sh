#!/usr/bin/env bash
# Genera public/data/busties-<país>.geojson amb TOTES les bústies d'un país a partir d'OSM.
# Ús:  bash scripts/build-data.sh es    |   bash scripts/build-data.sh pt
# Requereix osmium-tool:  brew install osmium-tool   |   sudo apt install osmium-tool
set -euo pipefail

command -v osmium >/dev/null || { echo "Falta osmium: brew install osmium-tool"; exit 1; }

COUNTRY="${1:-es}"
WORK="${WORK:-.osm-cache}"
OUT="public/data/busties-$COUNTRY.geojson"
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
  *)
    echo "País desconegut: $COUNTRY (de moment: es, pt)"; exit 1 ;;
esac

INPUTS=()
for entry in "${EXTRACTS[@]}"; do
  name="${entry%%|*}"
  url="${entry#*|}"
  pbf="$WORK/$name.osm.pbf"
  echo "↓ $name"
  if [ -f "$pbf" ]; then
    curl -fL -z "$pbf" -o "$pbf" "$url"   # -z: només si hi ha versió nova
  else
    curl -fL -o "$pbf" "$url"
  fi

  echo "⚙ filtrant bústies ($name)"
  osmium tags-filter "$pbf" n/amenity=post_box -o "$WORK/$name-pb.osm.pbf" --overwrite
  osmium export "$WORK/$name-pb.osm.pbf" -f geojson --add-unique-id=type_id \
    -o "$WORK/$name-pb.geojson" --overwrite
  INPUTS+=("$WORK/$name-pb.geojson")
done

node scripts/slim-geojson.mjs "${INPUTS[@]}" "$OUT"
ls -lh "$OUT"
