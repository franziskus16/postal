// Converteix elements OSM a un GeoJSON lleuger amb només els camps que fa servir l'app.
// Ús: node scripts/slim-geojson.mjs entrada1.geojson [entrada2.geojson ...] sortida.geojson
// Accepta tant GeoJSON (osmium export) com la resposta JSON d'Overpass.
import { readFileSync, writeFileSync } from 'node:fs'

const KEEP = ['operator', 'brand', 'ref', 'collection_times', 'note', 'colour']

export function slimFeature(id, lng, lat, tags = {}) {
  const props = { id: String(id) }
  for (const k of KEEP) if (tags[k]) props[k] = tags[k]
  if (!props.operator && props.brand) props.operator = props.brand
  delete props.brand
  // 6 decimals ≈ 10 cm: prou precisió i fitxer més petit
  const round = (n) => Math.round(n * 1e6) / 1e6
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(lng), round(lat)] },
    properties: props,
  }
}

export function toFeatures(input) {
  if (input.type === 'FeatureCollection') {
    return input.features
      .filter((f) => f.geometry?.type === 'Point')
      .map((f) => {
        const [lng, lat] = f.geometry.coordinates
        return slimFeature(f.id ?? f.properties?.id ?? f.properties?.['@id'], lng, lat, f.properties)
      })
  }
  if (Array.isArray(input.elements)) {
    // Resposta d'Overpass
    return input.elements
      .filter((e) => e.type === 'node')
      .map((e) => slimFeature(`n${e.id}`, e.lon, e.lat, e.tags))
  }
  throw new Error('Format no reconegut')
}

export function merge(collections) {
  const byId = new Map()
  for (const feats of collections) for (const f of feats) byId.set(f.properties.id, f)
  return { type: 'FeatureCollection', features: [...byId.values()] }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Ús: node scripts/slim-geojson.mjs entrada... sortida.geojson')
    process.exit(1)
  }
  const out = args.pop()
  const fc = merge(args.map((p) => toFeatures(JSON.parse(readFileSync(p, 'utf8')))))
  writeFileSync(out, JSON.stringify(fc))
  console.log(`${fc.features.length} bústies → ${out}`)
}
