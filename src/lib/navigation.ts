import { distanceMeters, type LngLat } from './geo'

/** Rumb (graus, 0 = nord) d'un punt a un altre. */
export function bearing(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export interface Snap {
  point: LngLat // punt de la ruta més proper a la posició
  offRoute: number // metres de desviació
  segment: number // índex del segment
  along: number // metres recorreguts sobre la ruta
  remaining: number // metres que falten
}

/** Projecta la posició sobre la ruta (aprox. plana, suficient per a distàncies curtes). */
export function snapToRoute(pos: LngLat, line: [number, number][]): Snap {
  const kx = Math.cos((pos.lat * Math.PI) / 180)
  let best = { d: Infinity, seg: 0, t: 0 }
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1]
    const dx = (bx - ax) * kx, dy = by - ay
    const px = (pos.lng - ax) * kx, py = pos.lat - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0
    const ex = px - t * dx, ey = py - t * dy
    const d = ex * ex + ey * ey
    if (d < best.d) best = { d, seg: i, t }
  }
  const [ax, ay] = line[best.seg], [bx, by] = line[best.seg + 1] ?? line[best.seg]
  const point = { lng: ax + (bx - ax) * best.t, lat: ay + (by - ay) * best.t }

  let along = 0, total = 0
  for (let i = 0; i < line.length - 1; i++) {
    const seg = distanceMeters({ lng: line[i][0], lat: line[i][1] }, { lng: line[i + 1][0], lat: line[i + 1][1] })
    if (i < best.seg) along += seg
    if (i === best.seg) along += seg * best.t
    total += seg
  }
  return { point, offRoute: distanceMeters(pos, point), segment: best.seg, along, remaining: total - along }
}

/** Punt a `meters` metres des de l'inici de la ruta (per a la simulació). */
export function pointAlong(line: [number, number][], meters: number): { point: LngLat; heading: number } {
  let acc = 0
  for (let i = 0; i < line.length - 1; i++) {
    const a = { lng: line[i][0], lat: line[i][1] }
    const b = { lng: line[i + 1][0], lat: line[i + 1][1] }
    const seg = distanceMeters(a, b)
    if (acc + seg >= meters) {
      const t = seg ? (meters - acc) / seg : 0
      return { point: { lng: a.lng + (b.lng - a.lng) * t, lat: a.lat + (b.lat - a.lat) * t }, heading: bearing(a, b) }
    }
    acc += seg
  }
  const n = line.length
  return {
    point: { lng: line[n - 1][0], lat: line[n - 1][1] },
    heading: n > 1 ? bearing({ lng: line[n - 2][0], lat: line[n - 2][1] }, { lng: line[n - 1][0], lat: line[n - 1][1] }) : 0,
  }
}
