# ✉ POSTAL

App per trobar la bústia de correus més propera. Comença per Espanya i es pot ampliar a més països.
Les dades són d'OpenStreetMap (`amenity=post_box`), © OpenStreetMap contributors, llicència ODbL.

**Stack:** Vue 3 + TypeScript + Vite · MapLibre GL · mapa base d'OpenFreeMap (gratuït, sense clau) · Capacitor per a Android i iOS.

## Posar-ho en marxa

```bash
npm install
npm run data:city -- "Barcelona"   # dades d'una ciutat via Overpass (ràpid)
npm run dev
```

Per a tot Espanya (cal `osmium-tool`; baixa uns ~1,3 GB de Geofabrik la primera vegada):

```bash
npm run data:spain
```

L'Action `.github/workflows/update-data.yml` ho torna a generar cada dilluns i fa commit del GeoJSON.

## Estructura

```
src/App.vue            mapa, grups de punts, fitxa de la bústia, «bústia més propera»
src/lib/geo.ts         distàncies (Haversine), N més properes, enllaç de ruta
src/lib/location.ts    GPS (natiu amb Capacitor, navegador a la web)
src/lib/data.ts        càrrega del GeoJSON
scripts/               OSM → GeoJSON lleuger (només operator, ref, collection_times, note)
public/data/           aquí va busties-es.geojson (generat)
```

## Apps natives (Capacitor)

Necessites **Android Studio** (per a Android) i **Xcode** (per a iOS, només en Mac).

**Primera vegada:**

```bash
npm install
npx cap add android
npx cap add ios
npm run cap:sync        # compila la web, la copia a les apps i hi posa els permisos d'ubicació
npm run native:assets   # genera totes les icones i pantalles d'inici a partir d'assets/
```

**Cada cop que canviïs el codi:** `npm run cap:sync`, i després obre l'app:

```bash
npx cap open android    # Android Studio → ▶ per provar-la al mòbil o a l'emulador
npx cap open ios        # Xcode → tria el teu iPhone → ▶
```

- L'app baixa les dades de bústies de `https://francescgimenez.com/postal/data/`, així té les de cada setmana sense publicar versions noves. Si no hi ha connexió, fa servir les que porta dins.
- `scripts/native-setup.mjs` afegeix els permisos d'ubicació (Android) i el text del permís (iOS), i crea les traduccions del text a `ios/App/App/<idioma>.lproj/`.
  **Un sol cop a Xcode:** arrossega les carpetes `ca.lproj`, `es.lproj`, `pt.lproj`, `fr.lproj`, `it.lproj` i `en.lproj` de `App/App` al grup *App* (marca «Create folder references» i el target *App*). Sense això, el permís surt en anglès.
- Icones i pantalla d'inici: `assets/` (segell riso amb la P). Si les canvies, torna a executar `npm run native:assets`.
- Política de privacitat (la demanen les botigues): `https://francescgimenez.com/postal/privacy.html`.

## Publicar

| On | Cost | Notes |
|---|---|---|
| Web / PWA (Hostinger, GitHub Pages, Cloudflare Pages) | 0 € | `npm run build` → puja `dist/` |
| Provar al teu Android | 0 € | Instal·la l'APK directament |
| Provar al teu iPhone | 0 € | Xcode amb Apple ID gratuït (la instal·lació caduca als 7 dies) |
| Google Play | 25 $ un cop | Comptes personals: test tancat amb 12 testers durant 14 dies abans de producció |
| App Store | 99 $/any | Cal Mac o compilació al núvol |

Abans de publicar a les botigues necessitaràs: icona i splash (`@capacitor/assets`), política de privacitat (la ubicació no surt del dispositiu) i captures de pantalla.

## Properes passes

- [ ] Comprovar la cobertura de dades a la teva ciutat
- [ ] PWA: manifest + service worker (`vite-plugin-pwa`) per poder-la fer servir sense connexió
- [ ] Si el GeoJSON d'Espanya és massa gran: convertir-lo a PMTiles amb tippecanoe
- [ ] Filtre per operador (Correos, etc.) i «recull avui»
- [ ] Afegir o corregir bústies (API d'OSM amb OAuth2)
- [ ] Més països: afegir extractes a `build-data-spain.sh`
