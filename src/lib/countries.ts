import type { LngLat } from './geo'
import type { ThemeCode } from '../map/themes'

export interface Country {
  code: ThemeCode
  name: string // en català, per a la interfície
  postmark: string // el que surt al mata-segells del sobre
  data: string // fitxer generat per scripts/build-data.sh (dins de /data/)
  center: [number, number]
  zoom: number
}

export const COUNTRIES: Record<ThemeCode, Country> = {
  es: {
    code: 'es',
    name: 'Espanya',
    postmark: 'ESPANYA',
    data: 'busties-es.geojson',
    center: [-3.7, 40.2],
    zoom: 5,
  },
  pt: {
    code: 'pt',
    name: 'Portugal',
    postmark: 'PORTUGAL',
    data: 'busties-pt.geojson',
    center: [-8.2, 39.6],
    zoom: 6,
  },
}

// Contorns aproximats (prou per saber en quin país ets; a pocs km de la
// frontera es pot equivocar). [lng, lat]
const PORTUGAL_MAINLAND: [number, number][] = [
  [-8.9, 41.87], [-8.65, 42.05], [-8.2, 42.15], [-8.08, 41.81], [-7.6, 41.87],
  [-7.2, 41.88], [-6.6, 41.94], [-6.19, 41.58], [-6.5, 41.27], [-6.93, 41.0],
  [-6.8, 40.25], [-7.02, 39.67], [-7.3, 39.45], [-7.05, 38.9], [-7.3, 38.45],
  [-6.93, 38.2], [-7.45, 37.85], [-7.5, 37.5], [-7.41, 37.18], [-7.9, 36.9],
  [-9.0, 36.9], [-8.95, 37.95], [-9.6, 38.75], [-9.5, 39.4], [-9.0, 40.2],
  [-8.75, 41.0], [-8.9, 41.87],
]
const BOXES: Record<string, [number, number, number, number][]> = {
  // [oest, sud, est, nord]
  ptIslands: [
    [-31.5, 36.8, -24.8, 39.8], // Açores
    [-17.4, 32.3, -16.2, 33.2], // Madeira
  ],
  es: [
    [-9.6, 35.1, 4.6, 43.9], // península, Balears, Ceuta i Melilla
    [-18.4, 27.5, -13.3, 29.5], // Canàries
  ],
}

function inBox(p: LngLat, [w, s, e, n]: [number, number, number, number]) {
  return p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n
}

function inPolygon(p: LngLat, poly: [number, number][]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Latitud aproximada de la frontera dels Pirineus (al nord, ja és França). */
function pyreneesLat(lng: number) {
  const pts: [number, number][] = [[-1.8, 43.38], [-1.0, 43.0], [0, 42.7], [1.5, 42.5], [3.3, 42.43]]
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
    if (lng <= x1) return y0 + ((lng - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 42.43
}

/** País de POSTAL on cau un punt, o undefined si encara no el cobrim. */
export function detectCountry(p: LngLat): ThemeCode | undefined {
  if (inPolygon(p, PORTUGAL_MAINLAND) || BOXES.ptIslands.some((b) => inBox(p, b))) return 'pt'
  if (BOXES.es.some((b) => inBox(p, b))) {
    if (p.lng > -1.8 && p.lat > pyreneesLat(p.lng)) return undefined // França
    return 'es'
  }
  return undefined
}
