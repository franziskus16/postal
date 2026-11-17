// Parteix les bústies d'un país en tessel·les petites perquè l'app només
// descarregui la zona on ets (com Google Maps), i no tot el país.
//
//   public/data/<país>/index.json      → quantes bústies hi ha a cada tessel·la
//   public/data/<país>/<x>_<y>.json    → les bústies d'una tessel·la de 0,25° (~25 km)
//   public/data/<país>/stamps/...      → el mateix per als llocs on comprar segells
//
// Ús: node scripts/tiles.mjs <país> entrada1.geojson [...]
//     node scripts/tiles.mjs <país> --stamps entrada1.geojson [...]
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { toFeatures, toStampFeatures, merge } from './slim-geojson.mjs'

export const CELL = 0.25 // graus; ha de coincidir amb src/lib/tiles.ts

export const tileKey = (lng, lat) => `${Math.floor(lng / CELL)}_${Math.floor(lat / CELL)}`

const dirFor = (country, layer = '') => join('public', 'data', country, layer)

/** Llegeix totes les bústies que ja hi ha a les tessel·les d'un país. */
export function readTiles(country, layer = '') {
  const dir = dirFor(country, layer)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).features)
}

/** Escriu les tessel·les i l'índex d'un país (substitueix les anteriors). */
export function writeTiles(country, features, layer = '') {
  const dir = dirFor(country, layer)
  mkdirSync(dir, { recursive: true })
  // esborrem només les tessel·les d'aquesta capa (no les subcarpetes d'altres capes)
  for (const f of readdirSync(dir)) if (f.endsWith('.json')) rmSync(join(dir, f))

  const groups = new Map()
  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates
    const key = tileKey(lng, lat)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(f)
  }

  const tiles = {}
  for (const [key, feats] of groups) {
    writeFileSync(join(dir, `${key}.json`), JSON.stringify({ type: 'FeatureCollection', features: feats }))
    tiles[key] = feats.length
  }
  const index = { country, layer: layer || 'postboxes', cell: CELL, total: features.length, updated: new Date().toISOString().slice(0, 10), tiles }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index))
  return index
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const stamps = args.includes('--stamps')
  const [country, ...inputs] = args.filter((a) => a !== '--stamps')
  if (!country || !inputs.length) {
    console.error('Ús: node scripts/tiles.mjs <país> [--stamps] entrada.geojson [...]')
    process.exit(1)
  }
  const convert = stamps ? toStampFeatures : toFeatures
  const fc = merge(inputs.map((p) => convert(JSON.parse(readFileSync(p, 'utf8')))))
  const layer = stamps ? 'stamps' : ''
  const index = writeTiles(country, fc.features, layer)
  const what = stamps ? 'llocs per comprar segells' : 'bústies'
  console.log(`${country}: ${index.total} ${what} en ${Object.keys(index.tiles).length} tessel·les → ${dirFor(country, layer)}/`)
}
