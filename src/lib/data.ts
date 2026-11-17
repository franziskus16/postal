import type { PostboxCollection } from './geo'

/** Carrega un GeoJSON de bústies generat pels scripts de /scripts. */
export async function loadPostboxes(url: string): Promise<PostboxCollection> {
  const res = await fetch(url)
  // Vite retorna index.html (200) si el fitxer no existeix: comprovem que sigui JSON
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || type.includes('text/html')) throw new Error(`No s'han trobat les dades (${res.status})`)
  return (await res.json()) as PostboxCollection
}

/**
 * D'on surten les dades:
 *  - a la web: del mateix lloc (./data/), que GitHub Pages actualitza cada setmana
 *  - a l'app mòbil: de la web publicada (VITE_DATA_BASE), perquè tingui les dades
 *    noves sense publicar una versió nova a les botigues. Si no hi ha connexió,
 *    fa servir les que porta dins l'app.
 */
const REMOTE_BASE = import.meta.env.VITE_DATA_BASE as string | undefined
const LOCAL_BASE = './data/'

export async function loadCountryFile(file: string): Promise<PostboxCollection> {
  if (REMOTE_BASE) {
    try {
      return await loadPostboxes(REMOTE_BASE + file)
    } catch {
      /* sense connexió: provem les dades de dins l'app */
    }
  }
  return loadPostboxes(LOCAL_BASE + file)
}
