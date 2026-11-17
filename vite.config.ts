import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './', // rutes relatives: necessari per a Capacitor
  // MapLibre v6 carrega el seu worker com a fitxer apart (maplibre-gl-worker.mjs):
  // si Vite el pre-empaqueta, el worker no es troba i el mapa surt buit.
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
