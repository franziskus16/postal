// Parteix les bústies d'un país en tessel·les petites perquè l'app només
// descarregui la zona on ets (com Google Maps), i no tot el país.
//
//   public/data/<país>/index.json      → quantes bústies hi ha a cada tessel·la
//   public/data/<país>/<x>_<y>.json    → les bústies d'una tessel·la de 0,25° (~25 km)
//
// Ús: node scripts/tiles.mjs <país> entrada1.geojson [entrada2.geojson ...]
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { toFeatures, merge } from './slim-geojson.mjs'

export const CELL = 0.25 // graus; ha de coincidir amb src/lib/tiles.ts

export const tileKey = (lng, lat) => `${Math.floor(lng / CELL)}_${Math.floor(lat / CELL)}`

const dirFor = (country) => join('public', 'data', country)

/** Llegeix totes les bústies que ja hi ha a les tessel·les d'un país. */
export function readTiles(country) {
  const dir = dirFor(country)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).features)
}

/** Escriu les tessel·les i l'índex d'un país (substitueix les anteriors). */
export function writeTiles(country, features) {
  const dir = dirFor(country)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

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
  const index = { country, cell: CELL, total: features.length, updated: new Date().toISOString().slice(0, 10), tiles }
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index))
  return index
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [country, ...inputs] = process.argv.slice(2)
  if (!country || !inputs.length) {
    console.error('Ús: node scripts/tiles.mjs <país> entrada.geojson [...]')
    process.exit(1)
  }
  const fc = merge(inputs.map((p) => toFeatures(JSON.parse(readFileSync(p, 'utf8')))))
  const index = writeTiles(country, fc.features)
  console.log(`${country}: ${index.total} bústies en ${Object.keys(index.tiles).length} tessel·les → ${dirFor(country)}/`)
}
