export interface LngLat {
  lng: number
  lat: number
}

export interface PostboxProps {
  id: string
  operator?: string
  ref?: string
  collection_times?: string
  note?: string
  colour?: string
  country?: string
  // llocs on comprar segells
  kind?: 'tobacco' | 'post_office' | 'post_partner' | 'vending'
  name?: string
  opening_hours?: string
}

export interface PostboxFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: PostboxProps
}

export interface PostboxCollection {
  type: 'FeatureCollection'
  features: PostboxFeature[]
}

const R = 6371000 // radi de la Terra en metres

/** Distància en metres entre dos punts (fórmula de Haversine). */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Les N bústies més properes a un punt, ordenades per distància. */
export function nearest(
  origin: LngLat,
  features: PostboxFeature[],
  n = 5,
): { feature: PostboxFeature; distance: number }[] {
  return features
    .map((feature) => {
      const [lng, lat] = feature.geometry.coordinates
      return { feature, distance: distanceMeters(origin, { lng, lat }) }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

/** Enllaç que obre la ruta a l'app de Google Maps (o la web si no hi és). */
export function directionsUrl(to: LngLat, mode: 'foot' | 'bike' = 'foot'): string {
  const travelmode = mode === 'bike' ? 'bicycling' : 'walking'
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${travelmode}`
}
