import { createApp } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import { setWorkerUrl } from 'maplibre-gl'
// MapLibre v6 carrega el seu «worker» d'un fitxer apart. En compilar, Vite no
// el copia sol: l'importem com a URL perquè vagi a dist/ i li diem on és.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
// Tipografies dins l'app (sense Google Fonts): funcionen sense connexió i
// no envien l'adreça IP de l'usuari a tercers
import '@fontsource/bricolage-grotesque/latin-500.css'
import '@fontsource/bricolage-grotesque/latin-700.css'
import '@fontsource/bricolage-grotesque/latin-800.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import '@fontsource/caveat/latin-600.css'
import './style.css'
import App from './App.vue'

setWorkerUrl(mapWorkerUrl)

createApp(App).mount('#app')
