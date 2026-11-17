import { Geolocation } from '@capacitor/geolocation'
import type { LngLat } from './geo'

/**
 * Posició actual. @capacitor/geolocation fa servir el GPS natiu a Android/iOS
 * i l'API del navegador a la web, així que el mateix codi serveix per a tot.
 */
export async function getCurrentPosition(): Promise<LngLat> {
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
  return { lng: pos.coords.longitude, lat: pos.coords.latitude }
}

export interface Fix extends LngLat {
  heading: number | null // graus, si el dispositiu el dona
  accuracy: number
}

/** Segueix la posició en temps real. Retorna una funció per aturar-ho. */
export async function watchPosition(onFix: (f: Fix) => void, onError: (e: unknown) => void) {
  const id = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 },
    (pos, err) => {
      if (err || !pos) return onError(err)
      onFix({
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
        heading: pos.coords.heading ?? null,
        accuracy: pos.coords.accuracy,
      })
    },
  )
  return () => Geolocation.clearWatch({ id })
}
