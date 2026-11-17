import type { LngLat } from './geo'

/**
 * Rutes a peu i en bici amb els servidors OSRM gratuïts de FOSSGIS
 * (routing.openstreetmap.de). Són per a ús moderat: si l'app creix,
 * caldrà muntar un OSRM/Valhalla/GraphHopper propi.
 */
export type TravelMode = 'foot' | 'bike'

export interface RouteStep {
  instruction: string
  icon: string
  street: string
  distance: number // metres fins al següent pas
  location: [number, number] // on comença la maniobra
}

export interface Route {
  coordinates: [number, number][]
  distance: number
  duration: number
  steps: RouteStep[]
}

const BASE = 'https://routing.openstreetmap.de'
const PROFILE: Record<TravelMode, string> = { foot: 'routed-foot', bike: 'routed-bike' }

export async function fetchRoute(from: LngLat, to: LngLat, mode: TravelMode): Promise<Route> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  // El segment «driving» és fix a l'API d'OSRM; el perfil real el marca el servidor
  const url = `${BASE}/${PROFILE[mode]}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Ruta no disponible (${res.status})`)
  const json = await res.json()
  const r = json.routes?.[0]
  if (!r) throw new Error('No hi ha cap ruta')

  const steps: RouteStep[] = r.legs.flatMap((leg: any) =>
    leg.steps.map((s: any) => ({
      instruction: describe(s.maneuver, s.name),
      icon: arrowFor(s.maneuver),
      street: s.name ?? '',
      distance: s.distance,
      location: s.maneuver.location,
    })),
  )
  return { coordinates: r.geometry.coordinates, distance: r.distance, duration: r.duration, steps }
}

const DIR: Record<string, string> = {
  left: 'a l’esquerra',
  right: 'a la dreta',
  'slight left': 'lleugerament a l’esquerra',
  'slight right': 'lleugerament a la dreta',
  'sharp left': 'molt a l’esquerra',
  'sharp right': 'molt a la dreta',
  straight: 'recte',
  uturn: 'mitja volta',
}

function describe(m: { type: string; modifier?: string }, street: string): string {
  const on = street ? ` per ${street}` : ''
  const dir = m.modifier ? DIR[m.modifier] ?? '' : ''
  switch (m.type) {
    case 'depart':
      return `Surt${on}`
    case 'arrive':
      return 'La bústia és al davant'
    case 'roundabout':
    case 'rotary':
      return `A la rotonda, agafa la sortida${on}`
    case 'continue':
    case 'new name':
      return `Continua ${dir || 'recte'}${on}`
    default:
      return m.modifier === 'straight' ? `Segueix recte${on}` : `Gira ${dir}${on}`
  }
}

function arrowFor(m: { type: string; modifier?: string }): string {
  if (m.type === 'arrive') return '✉'
  if (m.type === 'roundabout' || m.type === 'rotary') return '↻'
  switch (m.modifier) {
    case 'left':
    case 'sharp left':
      return '←'
    case 'right':
    case 'sharp right':
      return '→'
    case 'slight left':
      return '↖'
    case 'slight right':
      return '↗'
    case 'uturn':
      return '↶'
    default:
      return '↑'
  }
}
