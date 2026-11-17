import { createApp } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import { setWorkerUrl } from 'maplibre-gl'
// MapLibre v6 carrega el seu «worker» d'un fitxer apart. En compilar, Vite no
// el copia sol: l'importem com a URL perquè vagi a dist/ i li diem on és.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import './style.css'
import App from './App.vue'

setWorkerUrl(mapWorkerUrl)

createApp(App).mount('#app')
