// Ajusta els projectes natius de Capacitor (android/ i ios/) per a POSTAL:
//  - permisos d'ubicació (amb el text que veu l'usuari, traduït a iOS)
//  - opcions que demanen les botigues
// Es pot executar tantes vegades com calgui: només afegeix el que falta.
// Ús: node scripts/native-setup.mjs   (ja ho fa «npm run cap:sync»)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const log = (msg) => console.log(`  ${msg}`)

// ── Android ─────────────────────────────────────────────
const manifest = 'android/app/src/main/AndroidManifest.xml'
if (existsSync(manifest)) {
  let xml = readFileSync(manifest, 'utf8')
  const lines = [
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    // el GPS no és obligatori: l'app també funciona sense (tauletes, etc.)
    '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  ]
  const missing = lines.filter((l) => !xml.includes(l.match(/android:name="([^"]+)"/)[1]))
  if (missing.length) {
    xml = xml.replace(/(\s*)<\/manifest>/, `\n    ${missing.join('\n    ')}\n$1</manifest>`)
    writeFileSync(manifest, xml)
    log(`Android: afegits ${missing.length} permisos d'ubicació`)
  } else log('Android: permisos d’ubicació ja hi són')
} else log('Android: encara no hi ha projecte (npx cap add android)')

// ── iOS ─────────────────────────────────────────────────
const iosDir = 'ios/App/App'
const plist = join(iosDir, 'Info.plist')

// Text del permís d'ubicació en cada idioma de l'app
const LOCATION_TEXT = {
  en: 'POSTAL uses your location to show you the nearest postboxes and places to buy stamps, and to guide you there.',
  ca: 'POSTAL fa servir la teva ubicació per mostrar-te les bústies i els llocs on comprar segells més propers, i per guiar-t’hi.',
  es: 'POSTAL usa tu ubicación para mostrarte los buzones y los sitios donde comprar sellos más cercanos, y para guiarte hasta ellos.',
  pt: 'O POSTAL usa a tua localização para te mostrar os marcos do correio e os locais onde comprar selos mais próximos, e para te guiar até lá.',
  fr: 'POSTAL utilise ta position pour te montrer les boîtes aux lettres et les points de vente de timbres les plus proches, et pour t’y guider.',
  it: 'POSTAL usa la tua posizione per mostrarti le cassette postali e i punti vendita di francobolli più vicini, e per guidarti fin lì.',
}

/** Posa (o substitueix) una clau al diccionari principal del plist. */
function setPlistKey(xml, key, valueXml) {
  const k = `<key>${key}</key>\\s*`
  const old = new RegExp(`\\s*${k}(?:<array>[\\s\\S]*?</array>|<string>[\\s\\S]*?</string>|<(?:true|false)\\s*/>)`)
  xml = xml.replace(old, '')
  // el diccionari principal és l'últim </dict> abans de </plist>
  return xml.replace(/\n?<\/dict>\s*<\/plist>\s*$/, `\n\t<key>${key}</key>\n\t${valueXml}\n</dict>\n</plist>\n`)
}

if (existsSync(plist)) {
  let xml = readFileSync(plist, 'utf8')
  xml = setPlistKey(xml, 'NSLocationWhenInUseUsageDescription', `<string>${LOCATION_TEXT.en}</string>`)
  xml = setPlistKey(
    xml,
    'CFBundleLocalizations',
    `<array>\n${Object.keys(LOCATION_TEXT).map((l) => `\t\t<string>${l}</string>`).join('\n')}\n\t</array>`,
  )
  // l'app no fa servir xifratge propi: evita la pregunta d'exportació a cada pujada
  xml = setPlistKey(xml, 'ITSAppUsesNonExemptEncryption', '<false/>')
  writeFileSync(plist, xml)
  log('iOS: text del permís d’ubicació, idiomes i xifratge configurats')

  // Traduccions del text del permís (InfoPlist.strings per idioma)
  for (const [lang, text] of Object.entries(LOCATION_TEXT)) {
    const dir = join(iosDir, `${lang}.lproj`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'InfoPlist.strings'), `"NSLocationWhenInUseUsageDescription" = "${text.replace(/"/g, '\\"')}";\n`)
  }
  log('iOS: traduccions creades a ios/App/App/<idioma>.lproj (cal afegir-les un cop a Xcode, vegeu el README)')
} else log('iOS: encara no hi ha projecte (npx cap add ios)')
