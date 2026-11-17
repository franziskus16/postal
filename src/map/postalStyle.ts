import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl'
import type { Theme } from './themes'

/**
 * Estil de mapa propi de POSTAL sobre les tessel·les vectorials gratuïtes
 * d'OpenFreeMap (esquema OpenMapTiles), amb estètica risograph:
 *  - poques tintes (blau, groc, vermell) sobre paper
 *  - trama de punts a l'aigua
 *  - les vies principals tenen una segona passada en groc desplaçada,
 *    com quan el registre de la riso no quadra
 *  - el gra del paper s'afegeix per CSS (vegeu .map::after a App.vue)
 */

const w = (pairs: [number, number][]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.6], ['zoom'], ...pairs.flat()] as ExpressionSpecification

const name: ExpressionSpecification = ['coalesce', ['get', 'name:latin'], ['get', 'name']]
const NAME_UP: ExpressionSpecification = ['upcase', name]

const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']
const FONT_ITALIC = ['Noto Sans Italic']

/** Desajust de registre de la segona tinta, en píxels. */
const MISREG: [number, number] = [1.6, 1.2]

const MAJOR = ['literal', ['primary', 'secondary', 'trunk']] as ExpressionSpecification
const MINOR = ['literal', ['minor', 'service', 'tertiary']] as ExpressionSpecification

/** Estil riso amb les tintes del tema del país. */
export function postalStyle(P: Theme): StyleSpecification {
  return {
    version: 8,
    name: 'POSTAL · Riso',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    },
    layers: [
      { id: 'paper', type: 'background', paint: { 'background-color': P.paper } },

      // ── Terra: groc ─────────────────────────────────────────
      {
        id: 'park',
        type: 'fill',
        source: 'omt',
        'source-layer': 'park',
        paint: { 'fill-color': P.primaryTint },
      },
      {
        id: 'landcover-green',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]],
        paint: {
          'fill-color': ['match', ['get', 'class'], 'wood', P.primaryTint2, P.primaryTint],
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 12, 0.9],
        },
      },

      // ── Aigua: blau clar + trama de punts ───────────────────
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': P.water } },
      {
        id: 'water-dots',
        type: 'fill',
        source: 'omt',
        'source-layer': 'water',
        paint: { 'fill-pattern': 'postal-dots', 'fill-opacity': 0.7 },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'omt',
        'source-layer': 'waterway',
        paint: { 'line-color': P.ink, 'line-opacity': 0.45, 'line-width': w([[8, 0.5], [16, 2]]) },
      },

      // ── Edificis: blau molt suau ────────────────────────────
      {
        id: 'building',
        type: 'fill',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-color': P.building,
          'fill-outline-color': P.buildingLine,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1],
        },
      },

      // ── Fronteres ───────────────────────────────────────────
      {
        id: 'boundary',
        type: 'line',
        source: 'omt',
        'source-layer': 'boundary',
        filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
        paint: {
          'line-color': P.accent,
          'line-width': ['match', ['get', 'admin_level'], 2, 1.4, 0.8],
          'line-dasharray': [3, 2],
          'line-opacity': 0.75,
        },
      },

      // ── Vies ────────────────────────────────────────────────
      {
        id: 'path',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 15,
        filter: ['==', ['get', 'class'], 'path'],
        paint: { 'line-color': P.ink, 'line-width': 1, 'line-dasharray': [1, 2], 'line-opacity': 0.5 },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['in', ['get', 'class'], MINOR],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': P.ink,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.25, 16, 0.55],
          'line-width': w([[12, 0.5], [18, 9]]),
        },
      },
      // segona passada groga desplaçada (desajust de registre)
      {
        id: 'road-major-yellow',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 8,
        filter: ['in', ['get', 'class'], MAJOR],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': P.primary, 'line-width': w([[8, 1.5], [18, 20]]), 'line-translate': MISREG },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 6,
        filter: ['in', ['get', 'class'], MAJOR],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': P.ink, 'line-width': w([[6, 0.5], [18, 14]]), 'line-opacity': 0.85 },
      },
      {
        id: 'motorway-yellow',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 5,
        filter: ['==', ['get', 'class'], 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': P.primary, 'line-width': w([[5, 2], [18, 22]]), 'line-translate': MISREG },
      },
      {
        id: 'motorway',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 5,
        filter: ['==', ['get', 'class'], 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': P.accent, 'line-width': w([[5, 0.8], [18, 16]]) },
      },
      {
        id: 'rail',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 10,
        filter: ['==', ['get', 'class'], 'rail'],
        paint: { 'line-color': P.ink, 'line-width': 1.2, 'line-dasharray': [4, 3], 'line-opacity': 0.7 },
      },

      // Edificis en 3D: només es noten quan el mapa s'inclina (navegació)
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, P.building, 40, P.buildingLine],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.9,
        },
      },

      // ── Rètols ─────────────────────────────────────────────
      {
        id: 'street-labels',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 15,
        layout: {
          'symbol-placement': 'line',
          'text-field': NAME_UP,
          'text-font': FONT,
          'text-size': 10,
          'text-letter-spacing': 0.12,
        },
        paint: { 'text-color': P.ink, 'text-halo-color': P.paper, 'text-halo-width': 1.5 },
      },
      {
        id: 'water-labels',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'water_name',
        layout: { 'text-field': name, 'text-font': FONT_ITALIC, 'text-size': 13, 'text-letter-spacing': 0.2 },
        paint: { 'text-color': P.ink },
      },
      {
        id: 'place-minor',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
        layout: {
          'text-field': NAME_UP,
          'text-font': FONT_BOLD,
          'text-size': 11,
          'text-letter-spacing': 0.25,
          'text-max-width': 8,
        },
        paint: { 'text-color': P.accent, 'text-halo-color': P.paper, 'text-halo-width': 1.5 },
      },
      {
        id: 'place-town',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['town', 'village']]],
        layout: { 'text-field': NAME_UP, 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.15 },
        paint: { 'text-color': P.ink, 'text-halo-color': P.paper, 'text-halo-width': 1.5 },
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        filter: ['==', ['get', 'class'], 'city'],
        layout: {
          'text-field': NAME_UP,
          'text-font': FONT_BOLD,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 16],
          'text-letter-spacing': 0.2,
        },
        paint: { 'text-color': P.ink, 'text-halo-color': P.paper, 'text-halo-width': 2 },
      },
      {
        id: 'place-country',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        maxzoom: 7,
        filter: ['==', ['get', 'class'], 'country'],
        layout: { 'text-field': NAME_UP, 'text-font': FONT_BOLD, 'text-size': 13, 'text-letter-spacing': 0.4 },
        paint: { 'text-color': P.accent, 'text-halo-color': P.paper, 'text-halo-width': 2 },
      },
    ],
  }
}
