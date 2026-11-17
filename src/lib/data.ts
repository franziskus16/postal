/**
 * D'on surten les dades de bústies (generades cada setmana per GitHub Actions):
 *  - a la web: del mateix lloc (./data/)
 *  - a l'app mòbil: de la web publicada (VITE_DATA_BASE), perquè tingui les dades
 *    noves sense publicar una versió nova a les botigues. Si no hi ha connexió,
 *    fa servir les que porta dins l'app.
 */
const REMOTE_BASE = import.meta.env.VITE_DATA_BASE as string | undefined
const LOCAL_BASE = './data/'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  // Vite retorna index.html (200) si el fitxer no existeix: comprovem que sigui JSON
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || type.includes('text/html')) throw new Error(`No s'ha trobat ${url} (${res.status})`)
  return (await res.json()) as T
}

/** Carrega un fitxer de /data/ (p. ex. «es/index.json»). */
export async function loadJson<T>(path: string): Promise<T> {
  if (REMOTE_BASE) {
    try {
      return await fetchJson<T>(REMOTE_BASE + path)
    } catch {
      /* sense connexió: provem les dades de dins l'app */
    }
  }
  return fetchJson<T>(LOCAL_BASE + path)
}
