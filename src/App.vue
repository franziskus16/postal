<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl'
import { PostboxStore } from './lib/tiles'
import Intro from './components/Intro.vue'
import { COUNTRIES, detectCountry } from './lib/countries'
import { getCurrentPosition, watchPosition, type Fix } from './lib/location'
import { nearest, formatDistance, directionsUrl, distanceMeters, type PostboxFeature, type LngLat } from './lib/geo'
import { fetchRoute, type Route, type TravelMode } from './lib/routing'
import { snapToRoute, pointAlong, bearing } from './lib/navigation'
import { postalStyle } from './map/postalStyle'
import { placeTitle, placeStatus, placeWeek, kindLabel, isShop } from './lib/placeText'
import { t, lang, countryName, postmarkDate, applyDocumentLang } from './i18n'
import { ABOUT } from './about'

// Adreça pública de la web (la mateixa SITE_URL que fan servir les pàgines per ciutat)
const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || ABOUT.site).replace(/\/+$/, '')
const PRIVACY_URL = `${SITE_URL}/privacy.html`

// Pantalla d'introducció: la primera vegada (i quan es torna a obrir des de «Sobre POSTAL»)
const INTRO_KEY = 'postal:intro-seen'
const showIntro = ref(!(() => {
  try {
    return localStorage.getItem(INTRO_KEY)
  } catch {
    return null
  }
})())
function enterApp() {
  try {
    localStorage.setItem(INTRO_KEY, '1')
  } catch {
    /* sense emmagatzematge: la tornarà a veure, no passa res */
  }
  const first = showIntro.value
  showIntro.value = false
  // la ubicació es demana després d'haver explicat per què
  if (first && !lastKnown) locateOnStart()
}
import { addPostalIcons } from './map/icons'
import { THEMES, applyThemeCss, type ThemeCode } from './map/themes'

/**
 * Mode simulació per provar sense sortir de casa: la fletxa recorre la ruta sola.
 *   ?sim                 → comença a l'última posició coneguda o al centre del mapa
 *   ?sim=41.3870,2.1700  → comença en aquest punt (lat,lng)
 */
const simParam = new URLSearchParams(location.search).get('sim')
const SIMULATE = simParam !== null
const SIM_START: LngLat | undefined = (() => {
  const [lat, lng] = (simParam ?? '').split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined
})()
/**
 * Enllaç directe a un punt del mapa (des de les pàgines de ciutat):
 *   ?at=41.3870,2.1700&z=14  → obre el mapa aquí i no vola cap a la ubicació
 */
const AT: { pos: LngLat; zoom: number } | undefined = (() => {
  const q = new URLSearchParams(location.search)
  const [lat, lng] = (q.get('at') ?? '').split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  const z = Number(q.get('z'))
  return { pos: { lat, lng }, zoom: Number.isFinite(z) && z >= 3 && z <= 19 ? z : 14 }
})()
const SPEED: Record<TravelMode, number> = { foot: 1.4, bike: 4.5 } // m/s
const REROUTE_AFTER_M = 35
const ARRIVED_M = 15

const mapEl = ref<HTMLDivElement>()
const sheetEl = ref<HTMLElement>()
const map = shallowRef<MLMap>()
const features = shallowRef<PostboxFeature[]>([])
const results = ref<{ feature: PostboxFeature; distance: number }[]>([])
const selected = shallowRef<PostboxFeature>()
applyDocumentLang()
const status = ref(t('loading'))
const busy = ref(false)
const mode = ref<TravelMode>('foot')

// ── País i tema ──────────────────────────────────
const country = ref<ThemeCode>('es')
const theme = computed(() => THEMES[country.value])
const countryInfo = computed(() => COUNTRIES[country.value])
// Bústies de tots els països, per tessel·les: només es baixa la zona que mires
const store = new PostboxStore()
// Llocs on comprar segells (estancs, oficines de correus…), també per tessel·les
const stampStore = new PostboxStore('stamps')
type Section = 'boxes' | 'stamps'
const section = ref<Section>('boxes')
const activeStore = () => (section.value === 'boxes' ? store : stampStore)
let indexesReady: Promise<void> = Promise.resolve()
const hasData = ref(false)
/** Per sota d'aquest zoom es mostra el resum per zones; per sobre, cada bústia. */
const DETAIL_ZOOM = 9
let routeCoords: [number, number][] = []

// ── Estat de navegació ───────────────────────────
type NavPhase = 'off' | 'routing' | 'on' | 'arrived'
const phase = ref<NavPhase>('off')
const route = shallowRef<Route>()
let stepAlong: number[] = []
const along = ref(0)
const remaining = ref(0)
let stopWatch: (() => void) | undefined
let simTimer: number | undefined
let lastReroute = 0
let wakeLock: { release(): Promise<void> } | undefined
let userMarker: maplibregl.Marker | undefined
let lastKnown: LngLat | undefined
let arrowMarker: maplibregl.Marker | undefined

// ── La carta que portes ─────────────────────────
const recipient = ref('') // «A qui l'envies?» (opcional, surt escrit a mà al sobre)
const moving = ref(false) // fa gronxar la carta mentre camines
let lastFix: { at: number; pos: LngLat } | undefined
let stillTimer: number | undefined
const today = postmarkDate()
const destinationStreet = computed(() => {
  const steps = route.value?.steps ?? []
  return [...steps].reverse().find((s) => s.street)?.street ?? ''
})

const nextStep = computed(() => {
  const r = route.value
  if (!r) return undefined
  const i = stepAlong.findIndex((a) => a > along.value + 5)
  if (i < 0) return { ...r.steps[r.steps.length - 1], dist: remaining.value }
  return { ...r.steps[i], dist: stepAlong[i] - along.value }
})
const selectedIsShop = computed(() => !!selected.value && isShop(selected.value.properties))
const eta = computed(() => Math.max(1, Math.round(remaining.value / SPEED[mode.value] / 60)))

// ── Mapa ─────────────────────────────────────────
onMounted(() => {
  // Obrim on eres l'última vegada (si ho sabem); si no, el país sencer
  const start = SIM_START ?? AT?.pos ?? savedPosition()
  country.value = (start && detectCountry(start)) || 'es'
  applyThemeCss(theme.value)

  const m = new maplibregl.Map({
    container: mapEl.value!,
    style: postalStyle(theme.value),
    center: start ? [start.lng, start.lat] : countryInfo.value.center,
    zoom: AT && !SIM_START ? AT.zoom : start ? 15 : countryInfo.value.zoom,
    maxPitch: 75,
    attributionControl: { compact: true },
  })
  map.value = m
  m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  // Cada cop que es carrega un estil (inici o canvi de país) hi tornem a posar les nostres capes
  m.on('style.load', addAppLayers)
  m.on('styleimagemissing', () => addPostalIcons(m, theme.value))

  m.on('click', 'clusters', async (e) => {
    const f = e.features?.[0]
    if (!f || phase.value !== 'off') return
    const src = m.getSource('busties') as GeoJSONSource
    const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id)
    m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom })
  })
  m.on('click', 'stamp-clusters', async (e) => {
    const f = e.features?.[0]
    if (!f || phase.value !== 'off') return
    const src = m.getSource('stamps') as GeoJSONSource
    const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id)
    m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom })
  })
  for (const layer of ['postbox', 'stamp-place']) {
    m.on('click', layer, (e) => {
      const id = e.features?.[0]?.properties.id
      const f = features.value.find((x) => x.properties.id === id)
      if (f && phase.value === 'off') select(f)
    })
  }
  // de lluny: clicar una zona hi apropa el mapa
  m.on('click', 'overview', async (e) => {
    const f = e.features?.[0]
    if (!f || phase.value !== 'off') return
    const center = (f.geometry as GeoJSON.Point).coordinates as [number, number]
    let zoom = DETAIL_ZOOM + 1
    if (f.properties.cluster_id !== undefined) {
      const src = m.getSource('overview') as GeoJSONSource
      zoom = Math.min(DETAIL_ZOOM + 1, await src.getClusterExpansionZoom(f.properties.cluster_id))
    }
    m.easeTo({ center, zoom })
  })
  for (const id of ['clusters', 'postbox', 'overview', 'stamp-clusters', 'stamp-place']) {
    m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
    m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
  }

  const codes = Object.keys(COUNTRIES)
  indexesReady = Promise.all([store.loadIndexes(codes), stampStore.loadIndexes(codes)]).then(() => {
    hasData.value = codes.some((c) => store.total(c) > 0)
    updateStatus()
    ;(map.value?.getSource('overview') as GeoJSONSource | undefined)?.setData(activeStore().overview())
    loadVisibleTiles()
  })
  m.on('moveend', () => {
    loadVisibleTiles()
    followCountryInView()
  })
  // sense esperar: el mapa ja es veu mentre el GPS respon (si cal, després de la introducció)
  if (!showIntro.value) locateOnStart()
})

/** Capes pròpies (bústies i ruta) amb els colors del tema actual. */
function addAppLayers() {
  const m = map.value!
  const T = theme.value
  addPostalIcons(m, T)

  m.addSource('route', {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } },
  })
  // ruta: segona tinta desplaçada + tinta d'accent (mateix efecte riso que el mapa)
  m.addLayer({
    id: 'route-offset',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': T.primary, 'line-width': 10, 'line-translate': [2, 2] },
  })
  m.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': T.accent, 'line-width': 6 },
  })

  // De lluny: quantes bústies hi ha a cada zona (de l'índex, sense baixar-les)
  m.addSource('overview', {
    type: 'geojson',
    data: activeStore().overview(),
    cluster: true,
    clusterRadius: 60,
    clusterProperties: { total: ['+', ['get', 'count']] },
  })
  m.addLayer({
    id: 'overview',
    type: 'symbol',
    source: 'overview',
    maxzoom: DETAIL_ZOOM,
    layout: {
      'icon-image': 'postal-postmark',
      'icon-size': ['interpolate', ['linear'], ['coalesce', ['get', 'total'], ['get', 'count']], 1, 0.8, 1000, 1.3],
      'icon-allow-overlap': true,
      'text-field': ['to-string', ['coalesce', ['get', 'total'], ['get', 'count']]],
      'text-font': ['Noto Sans Bold'],
      'text-size': 11,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': T.stripe },
  })

  m.addSource('busties', {
    type: 'geojson',
    data: store.collection(),
    cluster: true,
    clusterRadius: 48,
    clusterMaxZoom: 15,
    attribution: '© OpenStreetMap contributors',
  })
  m.addLayer({
    id: 'clusters',
    type: 'symbol',
    source: 'busties',
    minzoom: DETAIL_ZOOM,
    filter: ['has', 'point_count'],
    layout: {
      visibility: section.value === 'boxes' ? 'visible' : 'none',
      'icon-image': 'postal-postmark',
      'icon-size': ['step', ['get', 'point_count'], 0.85, 25, 1, 100, 1.2],
      'icon-allow-overlap': true,
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': T.stripe },
  })
  m.addLayer({
    id: 'postbox',
    type: 'symbol',
    source: 'busties',
    minzoom: DETAIL_ZOOM,
    filter: ['!', ['has', 'point_count']],
    layout: {
      visibility: section.value === 'boxes' ? 'visible' : 'none',
      // bústies blaves (Correio Azul) amb el seu color; la resta, el del país
      'icon-image': [
        'match',
        ['get', 'colour'],
        'blue',
        'postal-stamp-blue',
        ['concat', 'postal-stamp-', ['coalesce', ['get', 'country'], country.value]],
      ],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 17, 1],
      'icon-allow-overlap': true,
      // cada segell lleugerament girat, com enganxats a mà
      'icon-rotate': ['-', ['%', ['to-number', ['slice', ['get', 'id'], -1], 0], 7], 3],
    },
  })
  m.addLayer({
    id: 'postbox-selected',
    type: 'symbol',
    source: 'busties',
    filter: ['==', ['get', 'id'], selected.value?.properties.id ?? ''],
    layout: {
      'icon-image': ['concat', 'postal-stamp-selected-', ['coalesce', ['get', 'country'], country.value]],
      'icon-size': 1.3,
      'icon-allow-overlap': true,
    },
  })

  // ── Llocs on comprar segells ──
  const stampsVisible = section.value === 'stamps' ? 'visible' : 'none'
  m.addSource('stamps', {
    type: 'geojson',
    data: stampStore.collection(),
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: 15,
    attribution: '© OpenStreetMap contributors',
  })
  m.addLayer({
    id: 'stamp-clusters',
    type: 'symbol',
    source: 'stamps',
    minzoom: DETAIL_ZOOM,
    filter: ['has', 'point_count'],
    layout: {
      visibility: stampsVisible,
      'icon-image': 'postal-postmark',
      'icon-size': ['step', ['get', 'point_count'], 0.85, 25, 1, 100, 1.2],
      'icon-allow-overlap': true,
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': T.ink },
  })
  m.addLayer({
    id: 'stamp-place',
    type: 'symbol',
    source: 'stamps',
    minzoom: DETAIL_ZOOM,
    filter: ['!', ['has', 'point_count']],
    layout: {
      visibility: stampsVisible,
      'icon-image': ['concat', 'postal-shop-', ['get', 'kind'], '-', ['coalesce', ['get', 'country'], country.value]],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 17, 1],
      'icon-allow-overlap': true,
    },
  })
  m.addLayer({
    id: 'stamp-selected',
    type: 'symbol',
    source: 'stamps',
    filter: ['==', ['get', 'id'], selected.value?.properties.id ?? ''],
    layout: {
      visibility: stampsVisible,
      'icon-image': ['concat', 'postal-shop-', ['get', 'kind'], '-', ['coalesce', ['get', 'country'], country.value]],
      'icon-size': 1.45,
      'icon-allow-overlap': true,
    },
  })
}

/** Canvia entre bústies i segells: capes visibles, resum, llista i estat. */
function setSection(s: Section) {
  if (s === section.value) return
  section.value = s
  select(undefined)
  results.value = []
  const m = map.value
  if (m?.getLayer('postbox')) {
    const show = (ids: string[], on: boolean) => ids.forEach((id) => m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'))
    show(['clusters', 'postbox'], s === 'boxes')
    show(['stamp-clusters', 'stamp-place', 'stamp-selected'], s === 'stamps')
    ;(m.getSource('overview') as GeoJSONSource | undefined)?.setData(activeStore().overview())
  }
  features.value = activeStore().features()
  updateStatus()
  loadVisibleTiles()
  if (lastKnown) updateNearest(lastKnown)
}

function updateStatus() {
  const total = activeStore().total(country.value)
  // el país es diu en text (el color del mapa ja canvia sol segons on mires)
  status.value = total
    ? `${t(section.value === 'boxes' ? 'count' : 'countStamps', { n: total.toLocaleString(lang.value) })} · ${countryName(country.value)}`
    : t('noData', { country: countryName(country.value) })
}

/** Baixa les tessel·les de la zona visible (només si estàs prou a prop). */
async function loadVisibleTiles() {
  const m = map.value
  if (!m || m.getZoom() < DETAIL_ZOOM - 0.5) return
  const b = m.getBounds()
  if (await activeStore().ensureBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])) refreshPostboxes()
}

function refreshPostboxes() {
  features.value = activeStore().features()
  const src = section.value === 'boxes' ? 'busties' : 'stamps'
  ;(map.value?.getSource(src) as GeoJSONSource | undefined)?.setData(activeStore().collection())
}

/** Bústies més properes a un punt (baixa abans les tessel·les del voltant). */
async function updateNearest(pos: LngLat) {
  await indexesReady
  if (await activeStore().ensureAround(pos)) refreshPostboxes()
  results.value = nearest(pos, features.value, 5)
}

/** El color és el del país que tens al centre del mapa (no durant la navegació). */
function followCountryInView() {
  const m = map.value
  if (!m || phase.value === 'on' || phase.value === 'routing') return
  const c = m.getCenter()
  const here = detectCountry({ lng: c.lng, lat: c.lat })
  if (here) setCountry(here)
}

/** Canvia de país: el tema (mapa + interfície). Les bústies ja hi són totes. */
function setCountry(code: ThemeCode, fly = false) {
  if (code === country.value) return
  country.value = code
  applyThemeCss(theme.value)
  map.value?.setStyle(postalStyle(theme.value)) // 'style.load' hi torna a posar les capes
  if (fly) {
    results.value = []
    map.value?.flyTo({ center: COUNTRIES[code].center, zoom: COUNTRIES[code].zoom, padding: sheetPadding() })
  }
  updateStatus()
}

onBeforeUnmount(() => {
  stopNavigation()
  map.value?.remove()
})

function lngLatOf(f: PostboxFeature): LngLat {
  const [lng, lat] = f.geometry.coordinates
  return { lng, lat }
}

function select(f?: PostboxFeature) {
  selected.value = f
  const filter: maplibregl.FilterSpecification = ['==', ['get', 'id'], f?.properties.id ?? '']
  if (map.value?.getLayer('postbox-selected')) {
    map.value.setFilter('postbox-selected', filter)
    map.value.setFilter('stamp-selected', filter)
  }
  if (f) map.value?.easeTo({ center: f.geometry.coordinates, zoom: Math.max(map.value.getZoom(), 17) })
}

async function myPosition(): Promise<LngLat> {
  if (SIM_START) return SIM_START
  try {
    return await getCurrentPosition()
  } catch (e) {
    if (!SIMULATE) throw e
    // simulació sense GPS: última posició coneguda o el centre del mapa
    if (lastKnown) return lastKnown
    const c = map.value!.getCenter()
    return { lng: c.lng, lat: c.lat }
  }
}

const POS_KEY = 'postal:last-position'

function savedPosition(): LngLat | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null')
    return Number.isFinite(v?.lng) && Number.isFinite(v?.lat) ? v : undefined
  } catch {
    return undefined
  }
}

/** Pinta el punt blau «ets aquí», tria el tema del país i busca les bústies properes. */
async function placeUser(pos: LngLat) {
  const m = map.value
  if (!m) return
  lastKnown = pos
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ lng: pos.lng, lat: pos.lat }))
  } catch {
    /* sense emmagatzematge: no passa res */
  }
  userMarker?.remove()
  const el = document.createElement('div')
  el.className = 'you-are-here'
  userMarker = new maplibregl.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(m)
  const here = detectCountry(pos)
  if (here) setCountry(here) // tema del país on ets
  await updateNearest(pos)
}

/** En obrir l'app: centra el mapa on ets i mostra les bústies més properes. */
/** Que el punt quedi centrat a la part del mapa que no tapa el full inferior. */
function sheetPadding() {
  return { top: 70, bottom: sheetEl.value?.offsetHeight ?? 0, left: 0, right: 0 }
}

async function locateOnStart() {
  if (AT) return // ve d'un enllaç a una ciutat: ens quedem on ens han portat
  try {
    const pos = await myPosition()
    if (phase.value !== 'off' || selected.value) return // l'usuari ja ha començat a fer coses
    await placeUser(pos)
    await nextTick() // esperem que la llista surti per saber quant ocupa el full
    map.value?.flyTo({ center: [pos.lng, pos.lat], zoom: 16, duration: 1200, padding: sheetPadding() })
  } catch {
    /* sense permís: es queda la vista inicial i el botó «Troba la bústia» */
  }
}

async function locateMe() {
  const m = map.value
  if (!m) return
  busy.value = true
  try {
    const pos = await myPosition()
    await placeUser(pos)
    await nextTick()
    m.flyTo({ center: [pos.lng, pos.lat], zoom: 16, padding: sheetPadding() })
    if (!results.value.length) status.value = t('noneInData')
  } catch {
    status.value = t('noPermission')
  } finally {
    busy.value = false
  }
}

// ── Navegació pas a pas ─────────────────────────
async function startNavigation() {
  const m = map.value
  const target = selected.value
  if (!m || !target) return
  phase.value = 'routing'
  try {
    const start = await myPosition()
    await loadRoute(start)
    userMarker?.remove()
    arrowMarker = new maplibregl.Marker({
      element: arrowElement(),
      rotationAlignment: 'map',
      pitchAlignment: 'map',
    })
      .setLngLat([start.lng, start.lat])
      .addTo(m)
    phase.value = 'on'
    keepScreenOn()

    if (SIMULATE) simulate()
    else stopWatch = await watchPosition(onFix, () => (status.value = t('gpsLost')))
  } catch (e) {
    status.value = t('routeError')
    phase.value = 'off'
  }
}

async function loadRoute(from: LngLat) {
  const r = await fetchRoute(from, lngLatOf(selected.value!), mode.value)
  route.value = r
  stepAlong = r.steps.map((s) => snapToRoute({ lng: s.location[0], lat: s.location[1] }, r.coordinates).along)
  along.value = 0
  remaining.value = r.distance
  drawRemaining(r.coordinates)
}

function drawRemaining(coords: [number, number][]) {
  routeCoords = coords
  const src = map.value?.getSource('route') as GeoJSONSource | undefined
  src?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } })
}

function onFix(fix: Fix) {
  const r = route.value
  const m = map.value
  if (!r || !m || phase.value !== 'on') return

  const snap = snapToRoute(fix, r.coordinates)
  along.value = snap.along
  remaining.value = snap.remaining

  // la línia es va «menjant» a mesura que avances
  drawRemaining([[snap.point.lng, snap.point.lat], ...r.coordinates.slice(snap.segment + 1)])

  const a = r.coordinates[snap.segment], b = r.coordinates[snap.segment + 1] ?? a
  const heading = fix.heading ?? bearing({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] })
  arrowMarker?.setLngLat([fix.lng, fix.lat]).setRotation(heading)
  // càmera a peu de carrer: inclinada, amb els edificis en 3D i la fletxa
  // a la part baixa, perquè es vegi el carrer que tens al davant
  m.easeTo({
    center: [fix.lng, fix.lat],
    bearing: heading,
    pitch: 70,
    zoom: 18.8,
    padding: { top: 300, bottom: 200, left: 0, right: 0 },
    duration: 900,
  })
  trackMovement(fix)

  if (snap.remaining < ARRIVED_M) return arrive()

  // si et desvies, recalculem (com a molt cada 10 s)
  if (snap.offRoute > REROUTE_AFTER_M && Date.now() - lastReroute > 10000) {
    lastReroute = Date.now()
    loadRoute(fix).catch(() => {})
  }
}

function simulate() {
  const r = route.value!
  const speedUp = 6 // x6 perquè la prova no duri massa
  let meters = 0
  simTimer = window.setInterval(() => {
    meters += SPEED[mode.value] * speedUp
    const { point, heading } = pointAlong(r.coordinates, meters)
    onFix({ ...point, heading, accuracy: 5 })
  }, 1000)
}

/** Detecta si avances (per fer gronxar la carta com si caminessis). */
function trackMovement(fix: LngLat) {
  const now = Date.now()
  if (lastFix) {
    const speed = distanceMeters(lastFix.pos, fix) / Math.max(0.2, (now - lastFix.at) / 1000)
    if (speed > 0.4) {
      moving.value = true
      clearTimeout(stillTimer)
      stillTimer = window.setTimeout(() => (moving.value = false), 3000)
    }
  }
  lastFix = { at: now, pos: { lng: fix.lng, lat: fix.lat } }
}

function arrive() {
  phase.value = 'arrived'
  clearTimers()
  drawRemaining([])
  moving.value = false
  map.value?.easeTo({
    pitch: 45,
    bearing: map.value.getBearing(),
    zoom: 19,
    center: selected.value!.geometry.coordinates,
    padding: { top: 0, bottom: 200, left: 0, right: 0 },
  })
}

function clearTimers() {
  stopWatch?.()
  stopWatch = undefined
  if (simTimer) clearInterval(simTimer)
  simTimer = undefined
  wakeLock?.release().catch(() => {})
  wakeLock = undefined
}

function stopNavigation() {
  clearTimers()
  arrowMarker?.remove()
  arrowMarker = undefined
  route.value = undefined
  drawRemaining([])
  phase.value = 'off'
  moving.value = false
  lastFix = undefined
  map.value?.easeTo({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } })
}

async function keepScreenOn() {
  try {
    wakeLock = await (navigator as any).wakeLock?.request('screen')
  } catch {
    /* no tots els navegadors ho permeten */
  }
}

function arrowElement() {
  const el = document.createElement('div')
  el.className = 'nav-arrow'
  el.innerHTML = `
    <svg viewBox="0 0 40 40" width="58" height="58" aria-hidden="true">
      <path d="M20 4 L34 34 L20 26 L6 34 Z" fill="${theme.value.primary}" transform="translate(2 2)"/>
      <path d="M20 4 L34 34 L20 26 L6 34 Z" fill="${theme.value.accent}" stroke="${theme.value.ink}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`
  return el
}
</script>

<template>
  <Intro v-if="showIntro" @enter="enterApp" />
  <div class="app" :class="{ navigating: phase === 'on' }">
    <div ref="mapEl" class="map" />

    <!-- Capçalera / instrucció -->
    <header v-if="phase !== 'on'" class="brand">
      <h1 class="wordmark">POSTAL</h1>
      <span class="status">{{ status }}</span>
    </header>

    <header v-else-if="nextStep" class="instruction">
      <span class="instr-icon">{{ nextStep.icon }}</span>
      <span class="instr-text">
        <strong>{{ formatDistance(nextStep.dist) }}</strong>
        {{ nextStep.instruction }}
      </span>
    </header>

    <!-- La carta, en primer pla, com si la portessis a la mà -->
    <div
      v-if="(phase === 'on' || phase === 'arrived') && !selectedIsShop"
      class="letter"
      :class="{ walking: moving, bike: mode === 'bike', posted: phase === 'arrived' }"
      aria-hidden="true"
    >
      <div class="letter-hold">
        <div class="envelope">
          <div class="envelope-paper">
            <div class="env-stamp">
              <span class="env-stamp-word">POSTAL</span>
              <span class="env-stamp-icon">✉</span>
            </div>
            <div class="env-postmark">
              <span>{{ countryInfo.postmark }}</span>
              <span>{{ today }}</span>
            </div>
            <div class="env-address">
              <span class="env-label">{{ t('envFor') }}</span>
              <span class="env-hand">{{ recipient || t('envSomeone') }}</span>
              <span class="env-label">{{ t('envVia') }}</span>
              <span class="env-route">
                {{ t('postbox') }}{{ destinationStreet ? ` · ${destinationStreet}` : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Full inferior -->
    <section ref="sheetEl" class="sheet">
      <div class="airmail" aria-hidden="true" />
      <div class="sheet-body">
        <!-- Navegant -->
        <template v-if="phase === 'on'">
          <div class="nav-summary">
            <span class="denom">{{ formatDistance(remaining) }}</span>
            <span class="meta">
              <strong>{{ t(mode === 'foot' ? 'minOnFoot' : 'minByBike', { n: eta }) }}</strong>
              <small>{{ selectedIsShop && selected ? placeTitle(selected.properties) : t('toPostbox') }}</small>
            </span>
            <button class="ghost" @click="stopNavigation">{{ t('stop') }}</button>
          </div>
        </template>

        <!-- Arribada -->
        <template v-else-if="phase === 'arrived'">
          <div class="arrived">
            <span class="arrived-stamp" aria-hidden="true">{{ selectedIsShop ? '€' : '✉' }}</span>
            <div v-if="selectedIsShop">
              <strong>{{ t('arrivedShop') }}</strong>
              <small>{{ t('arrivedShopSub') }}</small>
            </div>
            <div v-else>
              <strong>{{ t('sent') }}</strong>
              <small>{{ recipient ? t('sentTo', { name: recipient }) : t('inBox') }}</small>
            </div>
          </div>
          <button class="primary" @click="stopNavigation(); select()">{{ t('done') }}</button>
        </template>

        <!-- Bústia o lloc seleccionat -->
        <template v-else-if="selected">
          <div class="card-head">
            <div>
              <strong>{{ placeTitle(selected.properties) }}</strong>
              <small v-if="selectedIsShop && selected.properties.name">{{ kindLabel(selected.properties) }}</small>
              <span
                class="state"
                :class="{ good: placeStatus(selected.properties).good === true, bad: placeStatus(selected.properties).good === false }"
              >
                {{ placeStatus(selected.properties).text }}
              </span>
              <small v-if="placeWeek(selected.properties)" class="week">{{ placeWeek(selected.properties) }}</small>
            </div>
            <button class="ghost" :aria-label="t('close')" @click="select()">✕</button>
          </div>
          <div class="modes" role="radiogroup" :aria-label="t('howToGo')">
            <button :class="{ on: mode === 'foot' }" role="radio" :aria-checked="mode === 'foot'" @click="mode = 'foot'">
              {{ t('onFoot') }}
            </button>
            <button :class="{ on: mode === 'bike' }" role="radio" :aria-checked="mode === 'bike'" @click="mode = 'bike'">
              {{ t('byBike') }}
            </button>
          </div>
          <label v-if="!selectedIsShop" class="to-field">
            <span>{{ t('toWhom') }}</span>
            <input v-model.trim="recipient" maxlength="40" :placeholder="t('optional')" autocomplete="off" />
          </label>
          <button class="primary" :disabled="phase === 'routing'" @click="startNavigation">
            <span class="primary-stamp" aria-hidden="true">➤</span>
            {{ phase === 'routing' ? t('routing') : t('takeMe') }}
          </button>
          <a class="gmaps" :href="directionsUrl(lngLatOf(selected), mode)" target="_blank" rel="noopener">
            {{ t('openGoogle') }}
          </a>
          <a v-if="selectedIsShop" class="gmaps" :href="countryInfo.post.url" target="_blank" rel="noopener">
            {{ t('buyOnline', { post: countryInfo.post.name }) }}
          </a>
        </template>

        <!-- Inici -->
        <template v-else>
          <div class="sections" role="tablist">
            <button
              role="tab"
              :aria-selected="section === 'boxes'"
              :class="{ on: section === 'boxes' }"
              @click="setSection('boxes')"
            >
              ✉ {{ t('sectionBoxes') }}
            </button>
            <button
              role="tab"
              :aria-selected="section === 'stamps'"
              :class="{ on: section === 'stamps' }"
              @click="setSection('stamps')"
            >
              € {{ t('sectionStamps') }}
            </button>
          </div>
          <button class="primary" :disabled="busy || !hasData" @click="locateMe">
            <span class="primary-stamp" aria-hidden="true">{{ section === 'boxes' ? '✉' : '€' }}</span>
            {{ busy ? t('searching') : section === 'boxes' ? t('findNearest') : t('findStamps') }}
          </button>
          <ol v-if="results.length" class="list">
            <li v-for="(r, i) in results" :key="r.feature.properties.id">
              <button class="item" @click="select(r.feature)">
                <span class="denom">{{ formatDistance(r.distance) }}</span>
                <span class="meta">
                  <strong>
                    {{ i === 0 && section === 'boxes' ? t('nearest') : placeTitle(r.feature.properties) }}
                  </strong>
                  <small
                    :class="{
                      good: placeStatus(r.feature.properties).good === true,
                      bad: placeStatus(r.feature.properties).good === false,
                    }"
                  >
                    {{ placeStatus(r.feature.properties).text }}
                  </small>
                </span>
                <span class="go">→</span>
              </button>
            </li>
          </ol>
          <p class="links">
            <button type="button" @click="showIntro = true">{{ t('about') }}</button>
            ·
            <a :href="`${PRIVACY_URL}?lang=${lang}`" target="_blank" rel="noopener">{{ t('privacy') }}</a>
            ·
            <a :href="`${SITE_URL}/${lang}/`" target="_blank" rel="noopener">{{ t('byCity') }}</a>
          </p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.app { position: relative; height: 100%; background: var(--paper); }
.map { position: absolute; inset: 0; }
/* gra de paper riso per sobre del mapa */
.map::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--riso-grain);
  mix-blend-mode: multiply;
  opacity: .5;
  z-index: 1;
}

/* ── Capçalera ─────────────────────────────── */
.brand, .instruction {
  position: absolute;
  z-index: 2;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 12px;
  background: var(--paper);
  border: 1.5px solid var(--ink);
  box-shadow: 4px 4px 0 var(--primary), 4px 4px 0 1.5px var(--ink);
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 10px 16px 9px;
  max-width: calc(100% - 76px); /* deixa lloc als botons de zoom */
}
.wordmark {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 26px;
  line-height: 1;
  letter-spacing: 0.08em;
  color: var(--ink);
  /* doble passada de tinta desajustada */
  text-shadow: 2px 1.5px 0 var(--primary);
}
.status {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}
.instruction {
  right: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--ink);
  color: var(--paper);
}
.instr-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 28px;
  font-weight: 800;
}
.instr-text { font-family: var(--font-display); font-size: 16px; line-height: 1.25; }
.instr-text strong { display: block; font-family: var(--font-mono); font-size: 22px; }

/* ── Full inferior ────────────────────────── */
.sheet {
  position: absolute;
  z-index: 2;
  left: 0; right: 0; bottom: 0;
  background: var(--paper);
  max-height: 48%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -1.5px 0 var(--ink);
}
.airmail { height: 8px; flex: none; background: var(--airmail-stripes); background-size: 32px 8px; }
.sheet-body {
  overflow-y: auto;
  padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
  color: var(--ink);
}
.primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 15px 18px;
  border: 1.5px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 17px;
  box-shadow: 4px 4px 0 var(--primary);
  transition: transform .08s, box-shadow .08s;
}
.primary:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--primary); }
.primary:disabled { opacity: .45; }
.primary-stamp {
  display: grid; place-items: center;
  width: 26px; height: 26px;
  background: var(--primary); color: var(--on-primary);
  font-size: 14px;
  outline: 2px dotted var(--primary); outline-offset: 2px;
}
.ghost {
  border: 1.5px solid var(--ink);
  background: var(--paper);
  color: var(--ink);
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 13px;
}

.list { list-style: none; margin: 16px 0 0; padding: 0; }
.list li { border-top: 1px dashed var(--ink-soft); }
.item {
  width: 100%;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 12px 2px;
  border: 0;
  background: none;
  text-align: left;
  color: var(--ink);
}
.denom {
  flex: none;
  min-width: 70px;
  padding: 6px 8px;
  border: 1.5px solid var(--ink);
  background: var(--primary);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  color: var(--on-primary);
}
.meta { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.meta strong, .card-head strong, .arrived strong { font-family: var(--font-display); font-size: 16px; }
.meta small, .card-head small, .arrived small { font-family: var(--font-mono); font-size: 11px; color: var(--ink-soft); }
.go { color: var(--accent); font-weight: 800; font-size: 18px; }

.links {
  margin: 14px 0 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
}
.links a, .links button {
  color: var(--ink-soft);
  font: inherit;
  background: none;
  border: 0;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.sections { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 12px; border: 1.5px solid var(--ink); }
.sections button {
  padding: 9px 10px;
  border: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
}
.sections button + button { border-left: 1.5px solid var(--ink); }
.sections button.on { background: var(--ink); color: var(--paper); }
.state { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--ink); }
.state.good, .meta small.good { color: var(--accent-good, #1E8A4C); }
.state.bad, .meta small.bad { color: var(--ink-soft); }
.week { opacity: .85; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.card-head > div { display: flex; flex-direction: column; gap: 3px; }
.modes { display: grid; grid-template-columns: 1fr 1fr; margin: 14px 0; border: 1.5px solid var(--ink); }
.modes button {
  padding: 10px;
  border: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.modes button + button { border-left: 1.5px solid var(--ink); }
.modes button.on { background: var(--accent); color: var(--on-accent); }

.nav-summary { display: flex; align-items: center; gap: 14px; }
.arrived { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.arrived > div { display: flex; flex-direction: column; gap: 3px; }
.arrived strong { font-size: 22px; }
.arrived-stamp {
  display: grid; place-items: center;
  width: 52px; height: 52px;
  background: var(--primary);
  font-size: 26px;
  outline: 3px dotted var(--primary); outline-offset: 3px;
  transform: rotate(-6deg);
  color: var(--on-primary);
}
/* ── Destinatari i Google Maps ─────────────── */
.to-field { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; border-bottom: 1.5px dashed var(--ink-soft); }
.to-field span { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); white-space: nowrap; }
.to-field input {
  flex: 1; min-width: 0; padding: 6px 2px;
  border: 0; background: none; outline: none;
  font-family: var(--font-hand); font-size: 24px; color: var(--ink);
}
.to-field input::placeholder { color: var(--ink-soft); opacity: .5; font-size: 18px; }
.gmaps {
  display: block; margin-top: 12px; text-align: center;
  font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  color: var(--ink); text-decoration: underline; text-underline-offset: 3px;
}

/* ── La carta en primer pla ──────────────────── */
.letter {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 84px; /* just per sobre del full inferior */
  width: min(78vw, 340px);
  transform: translateX(-50%);
  perspective: 700px;
  pointer-events: none;
}
.letter-hold {
  /* inclinada cap a tu, com si la duguessis a la mà */
  transform: rotateX(32deg) rotateZ(-5deg) translateY(8%);
  transform-origin: 50% 100%;
}
.letter.walking .letter-hold { animation: walk 0.9s ease-in-out infinite; }
.letter.walking.bike .letter-hold { animation: ride 0.45s ease-in-out infinite; }
.letter.posted .letter-hold { animation: post 1.1s cubic-bezier(.5, -0.3, .7, 1) forwards; }

@keyframes walk {
  0%, 100% { transform: rotateX(32deg) rotateZ(-5deg) translateY(8%); }
  25% { transform: rotateX(30deg) rotateZ(-3deg) translateY(5%); }
  50% { transform: rotateX(32deg) rotateZ(-5deg) translateY(8%); }
  75% { transform: rotateX(30deg) rotateZ(-7deg) translateY(5%); }
}
@keyframes ride {
  0%, 100% { transform: rotateX(32deg) rotateZ(-5deg) translateY(8%); }
  50% { transform: rotateX(31deg) rotateZ(-4.5deg) translateY(6.5%); }
}
/* en arribar, la carta s'allunya i entra a la bústia */
@keyframes post {
  0% { transform: rotateX(32deg) rotateZ(-5deg) translateY(8%); opacity: 1; }
  35% { transform: rotateX(10deg) rotateZ(0deg) translateY(0%) scale(1.02); opacity: 1; }
  100% { transform: rotateX(70deg) rotateZ(0deg) translateY(-160%) scale(0.15); opacity: 0; }
}

.envelope {
  /* sobre de correu aeri: vora de franges vermelles i blaves */
  padding: 7px;
  background: var(--airmail-stripes);
  background-size: 28px 28px;
  border: 1.5px solid var(--ink);
  box-shadow: 7px 7px 0 var(--primary), 7px 7px 0 1.5px var(--ink);
}
.envelope-paper {
  position: relative;
  aspect-ratio: 1.7;
  background: var(--paper);
  background-image: var(--riso-grain);
  background-blend-mode: multiply;
  overflow: hidden;
}
.env-stamp {
  position: absolute; top: 9%; right: 6%;
  width: 21%; aspect-ratio: .82;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  background: var(--primary);
  outline: 3px dotted var(--primary); outline-offset: 2px;
  box-shadow: inset 0 0 0 4px var(--primary), inset 0 0 0 5px var(--on-primary);
  color: var(--on-primary);
  transform: rotate(3deg);
}
.env-stamp-word { font-family: var(--font-display); font-weight: 800; font-size: 9px; letter-spacing: .08em; }
.env-stamp-icon { font-size: 18px; line-height: 1; }
.env-postmark {
  position: absolute; top: 6%; right: 20%;
  width: 26%; aspect-ratio: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 1.5px solid var(--accent); border-radius: 50%;
  box-shadow: 0 0 0 3px var(--paper) inset, 0 0 0 4px var(--accent) inset;
  color: var(--accent);
  font-family: var(--font-mono); font-size: 7.5px; font-weight: 600; letter-spacing: .06em; line-height: 1.5;
  transform: rotate(-14deg);
  mix-blend-mode: multiply;
  opacity: .85;
}
.env-postmark::after {
  /* ones de cancel·lació */
  content: ''; position: absolute; left: 92%; top: 30%; width: 90%; height: 40%;
  background: repeating-linear-gradient(transparent 0 4px, var(--accent) 4px 5.5px);
  -webkit-mask: radial-gradient(circle at 0 50%, transparent 0, #000 0);
}
.env-address {
  position: absolute; left: 9%; bottom: 13%; right: 9%;
  display: grid; grid-template-columns: auto 1fr; align-items: baseline; column-gap: 10px; row-gap: 2px;
}
.env-label { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: var(--ink-soft); }
.env-hand {
  font-family: var(--font-hand); font-size: 28px; line-height: 1.1; color: var(--ink);
  border-bottom: 1px solid var(--ink-soft);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.env-route {
  font-family: var(--font-mono); font-size: 10.5px; color: var(--ink);
  border-bottom: 1px solid var(--ink-soft); padding-bottom: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (prefers-reduced-motion: reduce) {
  .letter .letter-hold { animation: none !important; }
}
</style>
