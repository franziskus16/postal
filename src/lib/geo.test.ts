import { describe, it, expect } from 'vitest'
import { distanceMeters, nearest, formatDistance, type PostboxFeature } from './geo'
// @ts-expect-error script JS sense tipus
import { toFeatures, merge } from '../../scripts/slim-geojson.mjs'

const pt = (id: string, lng: number, lat: number): PostboxFeature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: { id },
})

describe('geo', () => {
  it('calcula distàncies raonables', () => {
    // Plaça Catalunya → Sagrada Família ≈ 1,9 km en línia recta
    const d = distanceMeters({ lng: 2.1700, lat: 41.3870 }, { lng: 2.1744, lat: 41.4036 })
    expect(d).toBeGreaterThan(1700)
    expect(d).toBeLessThan(2000)
  })

  it('ordena per proximitat', () => {
    const feats = [pt('lluny', 2.2, 41.4), pt('a prop', 2.1701, 41.3871), pt('mig', 2.18, 41.39)]
    const r = nearest({ lng: 2.17, lat: 41.387 }, feats, 2)
    expect(r.map((x) => x.feature.properties.id)).toEqual(['a prop', 'mig'])
  })

  it('formata distàncies', () => {
    expect(formatDistance(83.4)).toBe('83 m')
    expect(formatDistance(1530)).toBe('1.5 km')
  })
})

describe('slim-geojson', () => {
  it('converteix Overpass i osmium i elimina duplicats', () => {
    const overpass = {
      elements: [{ type: 'node', id: 1, lon: 2.1, lat: 41.3, tags: { amenity: 'post_box', brand: 'Correos', collection_times: 'Mo-Fr 18:00' } }],
    }
    const osmium = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'n1', geometry: { type: 'Point', coordinates: [2.1, 41.3] }, properties: { amenity: 'post_box' } },
        { type: 'Feature', id: 'n2', geometry: { type: 'Point', coordinates: [2.2, 41.4] }, properties: { amenity: 'post_box', operator: 'Correos', ref: '08-123' } },
        { type: 'Feature', id: 'n9', geometry: { type: 'Point', coordinates: [2.3, 41.5] }, properties: { shop: 'tobacco' } },
      ],
    }
    const fc = merge([toFeatures(overpass), toFeatures(osmium)])
    expect(fc.features).toHaveLength(2)
    expect(fc.features.find((f: PostboxFeature) => f.properties.id === 'n2').properties).toEqual({ id: 'n2', operator: 'Correos', ref: '08-123' })
    expect(toFeatures(overpass)[0].properties).toEqual({ id: 'n1', operator: 'Correos', collection_times: 'Mo-Fr 18:00' })
  })
})
