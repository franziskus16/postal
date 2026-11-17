import type { LngLat } from './geo'
import type { ThemeCode } from '../map/themes'

export interface Country {
  code: ThemeCode
  name: string // en català, per a la interfície
  postmark: string // el que surt al mata-segells del sobre (en l'idioma del país)
  center: [number, number]
  zoom: number
  post: { name: string; url: string } // operador postal (per comprar segells en línia)
}

export const COUNTRIES: Record<ThemeCode, Country> = {
  es: {
    code: 'es',
    name: 'Espanya',
    postmark: 'ESPAÑA',
    center: [-3.7, 40.2],
    zoom: 5,
    post: { name: 'Correos', url: 'https://www.correos.es' },
  },
  pt: {
    code: 'pt',
    name: 'Portugal',
    postmark: 'PORTUGAL',
    center: [-8.2, 39.6],
    zoom: 6,
    post: { name: 'CTT', url: 'https://www.ctt.pt' },
  },
  fr: {
    code: 'fr',
    name: 'França',
    postmark: 'FRANCE',
    center: [2.4, 46.6],
    zoom: 5,
    post: { name: 'La Poste', url: 'https://www.laposte.fr' },
  },
}

// Contorns aproximats (prou per saber en quin país ets; a pocs km de la
// frontera es pot equivocar). [lng, lat]
const PORTUGAL_MAINLAND: [number, number][] = [
  // riu Minho (Tui/Valença, Salvaterra/Monção) amb més detall: hi ha pobles a tocar
  [-8.9, 41.87], [-8.75, 41.96], [-8.64, 42.037], [-8.55, 42.06], [-8.48, 42.084],
  [-8.33, 42.1], [-8.2, 42.15], [-8.08, 41.81], [-7.6, 41.87],
  [-7.2, 41.88], [-6.6, 41.94], [-6.19, 41.58], [-6.5, 41.27], [-6.93, 41.0],
  [-6.8, 40.25], [-7.02, 39.67], [-7.3, 39.45], [-7.05, 38.9], [-7.3, 38.45],
  [-6.93, 38.2], [-7.45, 37.85], [-7.5, 37.5], [-7.41, 37.18], [-7.9, 36.9],
  [-9.0, 36.9], [-8.95, 37.95], [-9.6, 38.75], [-9.5, 39.4], [-9.0, 40.2],
  [-8.75, 41.0], [-8.9, 41.87],
]
// França metropolitana: frontera terrestre aproximada + mar (Còrsega a part)
const FRANCE_MAINLAND: [number, number][] = [
  [2.55, 51.09], [3.2, 50.75], [4.2, 49.95], [4.85, 49.8], [5.8, 49.55], [6.5, 49.45],
  [7.6, 49.05], [8.2, 48.97], [7.55, 47.6], [6.95, 47.25], [6.1, 46.4], [6.15, 46.15],
  [7.0, 45.9], [6.62, 45.1], [7.0, 44.25], [7.53, 43.78], [7.7, 43.3], [6.0, 42.8],
  [3.25, 42.42], [2.5, 42.36], [1.8, 42.44], [0.7, 42.75], [-0.3, 42.82], [-1.0, 43.05],
  [-1.79, 43.37], [-2.2, 43.6], [-2.0, 46.0], [-5.5, 48.3], [-4.8, 48.95], [-1.9, 49.8],
  [1.4, 50.4], [2.55, 51.09],
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
  frIslands: [
    [8.5, 41.3, 9.6, 43.05], // Còrsega
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
  if (BOXES.es.some((b) => inBox(p, b)) && !(p.lng > -1.8 && p.lat > pyreneesLat(p.lng))) return 'es'
  if (inPolygon(p, FRANCE_MAINLAND) || BOXES.frIslands.some((b) => inBox(p, b))) return 'fr'
  return undefined
}
