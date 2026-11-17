// Descarrega les bústies d'una ciutat amb l'Overpass API (ràpid, per desenvolupar).
// S'afegeixen a les tessel·les del país, així pots anar sumant ciutats.
// Ús: npm run data:city -- "Barcelona"          (Espanya per defecte)
//     npm run data:city -- "Lisboa" pt
//     npm run data:city -- "Paris" fr
import { toFeatures, merge } from './slim-geojson.mjs'
import { readTiles, writeTiles } from './tiles.mjs'

const city = process.argv[2] || 'Barcelona'
const country = (process.argv[3] || 'es').toLowerCase()

const query = `
[out:json][timeout:120];
area["name"="${city}"]["boundary"="administrative"]["admin_level"~"^(7|8)$"]->.a;
node["amenity"="post_box"](area.a);
out body;
`

// Servidors públics d'Overpass: si un està saturat, provem el següent
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchOverpass() {
  let wait = 5000
  for (let attempt = 1; attempt <= 4; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'busties-app/0.1' },
          body: 'data=' + encodeURIComponent(query),
        })
        if (res.ok) return await res.json()
        console.warn(`${new URL(url).host}: ${res.status}`)
      } catch (e) {
        console.warn(`${new URL(url).host}: ${e.message}`)
      }
    }
    if (attempt < 4) {
      console.warn(`Tots ocupats. Reintent en ${wait / 1000}s…`)
      await sleep(wait)
      wait *= 2
    }
  }
  console.error('Overpass no respon. Torna-ho a provar d\'aquí a una estona.')
  process.exit(1)
}

const previous = readTiles(country)
const fc = merge([previous, toFeatures(await fetchOverpass())])
writeTiles(country, fc.features)
console.log(`${city}: ${fc.features.length - previous.length} bústies noves · ${fc.features.length} en total → public/data/${country}/`)
