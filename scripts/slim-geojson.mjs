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

/** Tipus de lloc on es poden comprar segells, a partir de les etiquetes d'OSM. */
export function stampKind(tags = {}) {
  if (tags.vending === 'stamps' || /(^|;)stamps(;|$)/.test(tags.vending ?? '')) return 'vending'
  if (tags.amenity === 'post_office') return 'post_office'
  if (tags.amenity === 'post_partner') return 'post_partner'
  if (tags.shop === 'tobacco') return 'tobacco'
  return null
}

/** Punt representatiu d'una geometria (els edificis de correus solen ser polígons). */
function centroid(geom) {
  if (geom.type === 'Point') return geom.coordinates
  const pts = []
  const walk = (c) => (typeof c[0] === 'number' ? pts.push(c) : c.forEach(walk))
  walk(geom.coordinates)
  if (!pts.length) return null
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
}

/** Llocs on comprar segells: estancs, oficines de correus, punts col·laboradors i màquines. */
export function toStampFeatures(input) {
  const items =
    input.type === 'FeatureCollection'
      ? input.features.map((f) => ({ id: f.id ?? f.properties?.id, geom: f.geometry, tags: f.properties ?? {} }))
      : input.elements.map((e) => ({
          id: `${e.type[0]}${e.id}`,
          geom: { type: 'Point', coordinates: [e.lon ?? e.center?.lon, e.lat ?? e.center?.lat] },
          tags: e.tags ?? {},
        }))
  const round = (n) => Math.round(n * 1e6) / 1e6
  return items.flatMap(({ id, geom, tags }) => {
    const kind = tags.kind ?? stampKind(tags)
    const c = geom && centroid(geom)
    if (!kind || !c || c.some((n) => n == null || Number.isNaN(n))) return []
    const props = { id: String(id), kind }
    for (const k of ['name', 'opening_hours', 'operator']) if (tags[k]) props[k] = tags[k]
    return [{ type: 'Feature', geometry: { type: 'Point', coordinates: [round(c[0]), round(c[1])] }, properties: props }]
  })
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
