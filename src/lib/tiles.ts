import type { LngLat, PostboxCollection, PostboxFeature } from './geo'
import { loadJson } from './data'

/**
 * Bústies per tessel·les: l'app només descarrega la zona que estàs mirant.
 * Ha de coincidir amb scripts/tiles.mjs.
 */
export const CELL = 0.25

export interface TileIndex {
  country: string
  cell: number
  total: number
  updated: string
  tiles: Record<string, number> // "x_y" → nombre de bústies
}

export const tileKey = (lng: number, lat: number) => `${Math.floor(lng / CELL)}_${Math.floor(lat / CELL)}`

/** Claus de les tessel·les que toca un rectangle [oest, sud, est, nord]. */
export function keysInBounds([w, s, e, n]: [number, number, number, number]): string[] {
  const keys: string[] = []
  for (let x = Math.floor(w / CELL); x <= Math.floor(e / CELL); x++)
    for (let y = Math.floor(s / CELL); y <= Math.floor(n / CELL); y++) keys.push(`${x}_${y}`)
  return keys
}

/** Centre d'una tessel·la (per pintar el resum a zoom llunyà). */
export function tileCenter(key: string): [number, number] {
  const [x, y] = key.split('_').map(Number)
  return [(x + 0.5) * CELL, (y + 0.5) * CELL]
}

/**
 * Magatzem de bústies de tots els països: carrega els índexs (petits) a l'inici
 * i les tessel·les a mesura que les necessites, sense repetir descàrregues.
 */
export class PostboxStore {
  /** layer: '' per a les bústies, 'stamps' per als llocs on comprar segells */
  constructor(private layer = '') {}

  private path(country: string, file: string) {
    return this.layer ? `${country}/${this.layer}/${file}` : `${country}/${file}`
  }

  private indexes = new Map<string, TileIndex>()
  private loaded = new Map<string, PostboxFeature[]>() // "país/x_y" → bústies
  private pending = new Map<string, Promise<void>>()

  async loadIndexes(countries: string[]) {
    await Promise.all(
      countries.map(async (c) => {
        try {
          this.indexes.set(c, await loadJson<TileIndex>(this.path(c, 'index.json')))
        } catch {
          /* país sense dades encara */
        }
      }),
    )
  }

  total(country: string) {
    return this.indexes.get(country)?.total ?? 0
  }

  /** Resum per tessel·la de tots els països (per a la vista de lluny). */
  overview(): PostboxCollection & { features: GeoJSON.Feature<GeoJSON.Point, { count: number }>[] } {
    const features = [...this.indexes.values()].flatMap((idx) =>
      Object.entries(idx.tiles).map(([key, count]) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: tileCenter(key) },
        properties: { count },
      })),
    )
    return { type: 'FeatureCollection', features } as never
  }

  /** Assegura que les tessel·les del rectangle estan carregades. Retorna si n'ha baixat de noves. */
  async ensureBounds(bounds: [number, number, number, number], maxTiles = 60): Promise<boolean> {
    const wanted: string[] = []
    for (const key of keysInBounds(bounds))
      for (const [c, idx] of this.indexes) if (idx.tiles[key]) wanted.push(`${c}/${key}`)
    if (wanted.length > maxTiles) return false // massa lluny: es mostra el resum

    const todo = wanted.filter((id) => !this.loaded.has(id))
    if (!todo.length) return false
    await Promise.all(todo.map((id) => this.loadTile(id)))
    return true
  }

  /** Assegura les tessel·les al voltant d'un punt (per buscar les més properes). */
  ensureAround(p: LngLat, radiusDeg = CELL) {
    return this.ensureBounds([p.lng - radiusDeg, p.lat - radiusDeg, p.lng + radiusDeg, p.lat + radiusDeg])
  }

  private loadTile(id: string) {
    let p = this.pending.get(id)
    if (!p) {
      const [c, key] = id.split('/')
      p = loadJson<PostboxCollection>(this.path(c, `${key}.json`))
        .then((fc) => {
          // cada bústia sap de quin país és (per pintar-la amb el seu color)
          const country = id.split('/')[0]
          for (const f of fc.features) f.properties.country = country
          this.loaded.set(id, fc.features)
        })
        .catch(() => void this.loaded.set(id, [])) // si falla, no ho reintentem a cada moviment
      this.pending.set(id, p)
    }
    return p
  }

  /** Totes les bústies carregades fins ara. */
  features(): PostboxFeature[] {
    return [...this.loaded.values()].flat()
  }

  collection(): PostboxCollection {
    return { type: 'FeatureCollection', features: this.features() }
  }
}
