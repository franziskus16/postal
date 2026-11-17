import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { PostboxStore, keysInBounds, tileKey } from './tiles'

// fetch fals que llegeix els fitxers de public/data
beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const path = url.replace('./data/', 'public/data/')
    if (!existsSync(path)) return new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })
    return new Response(readFileSync(path, 'utf8'), { status: 200, headers: { 'content-type': 'application/json' } })
  })
})

describe('tessel·les', () => {
  it('claus de tessel·la coherents amb els límits', () => {
    expect(keysInBounds([2.1, 41.3, 2.2, 41.4])).toContain(tileKey(2.17, 41.38))
  })

  it('carrega només la zona i troba bústies a Barcelona', async () => {
    const store = new PostboxStore()
    await store.loadIndexes(['es', 'pt', 'fr'])
    expect(store.total('es')).toBeGreaterThan(1000)
    expect(store.total('fr')).toBe(0) // encara sense dades
    expect(store.features()).toHaveLength(0)
    expect(await store.ensureAround({ lng: 2.164, lat: 41.386 })).toBe(true)
    const n = store.features().length
    expect(n).toBeGreaterThan(50)
    expect(n).toBeLessThan(store.total('es'))
    expect(await store.ensureAround({ lng: 2.164, lat: 41.386 })).toBe(false) // ja carregades
    expect(store.overview().features.length).toBeGreaterThan(100)
  })

  it('no baixa res si la zona és massa gran', async () => {
    const store = new PostboxStore()
    await store.loadIndexes(['es'])
    expect(await store.ensureBounds([-10, 35, 4, 44])).toBe(false)
  })
})
