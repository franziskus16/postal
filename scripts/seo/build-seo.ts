/**
 * Pàgines estàtiques per als cercadors, generades a partir de les dades reals:
 *   /{idioma}/                         portada en cada idioma
 *   /{idioma}/{busties|buzones|…}/{ciutat}/   una pàgina per ciutat
 * i a més sitemap.xml, robots.txt i les metaetiquetes de la portada (dist/index.html).
 *
 * S'executa després de `vite build`:  SITE_URL=https://el-meu-domini npm run build
 * (SITE_URL és l'única cosa que cal canviar quan es canviï de domini.)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CITIES, cityLangs, cityName, type CC, type City, type Lang } from './cities'
import { LANG_NAMES, STRINGS, type Stats } from './strings'
import { fmtTime, formatWeek, parseHours } from '../../src/lib/hours'
import { ABOUT } from '../../src/about'

const SITE = (process.env.SITE_URL || ABOUT.site).replace(/\/+$/, '')
const DATA = process.env.DATA_DIR || 'public/data'
const OUT = process.env.OUT_DIR || 'dist'
const MIN_BOXES = 10
const CELL = 0.25
const LANGS: Lang[] = ['ca', 'es', 'pt', 'fr', 'it', 'en']
const CCS: CC[] = ['es', 'pt', 'fr', 'it']

const COLORS: Record<CC, { primary: string; accent: string; onPrimary: string }> = {
  es: { primary: '#FFD93B', accent: '#F15060', onPrimary: '#2C4BA0' },
  pt: { primary: '#E5402E', accent: '#00A95C', onPrimary: '#F8F1EC' },
  fr: { primary: '#FFC20E', accent: '#E8343A', onPrimary: '#2C4BA0' },
  it: { primary: '#D9322B', accent: '#009246', onPrimary: '#F8F2E8' },
}
const HOME_CC: Record<Lang, CC> = { ca: 'es', es: 'es', pt: 'pt', fr: 'fr', it: 'it', en: 'es' }

// ── Dades ────────────────────────────────────────
interface Feature {
  geometry: { coordinates: [number, number] }
  properties: Record<string, string | undefined>
}
interface Index { updated?: string; tiles: Record<string, number> }

const readJson = <T,>(p: string): T | undefined => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : undefined)
const tileCache = new Map<string, Feature[]>()
function tile(cc: CC, layer: '' | 'stamps/', key: string): Feature[] {
  const id = `${cc}/${layer}${key}`
  if (!tileCache.has(id)) tileCache.set(id, readJson<{ features: Feature[] }>(join(DATA, `${id}.json`))?.features ?? [])
  return tileCache.get(id)!
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Elements d'una capa a menys de r km del centre de la ciutat. */
function around(c: City, layer: '' | 'stamps/', index: Index | undefined) {
  if (!index) return []
  const dLat = c.r / 111
  const dLng = c.r / (111 * Math.cos((c.lat * Math.PI) / 180))
  const out: { f: Feature; d: number }[] = []
  for (let x = Math.floor((c.lng - dLng) / CELL); x <= Math.floor((c.lng + dLng) / CELL); x++)
    for (let y = Math.floor((c.lat - dLat) / CELL); y <= Math.floor((c.lat + dLat) / CELL); y++) {
      if (!index.tiles[`${x}_${y}`]) continue
      for (const f of tile(c.cc, layer, `${x}_${y}`)) {
        const [lng, lat] = f.geometry.coordinates
        const d = km(c, { lat, lng })
        if (d <= c.r) out.push({ f, d })
      }
    }
  return out.sort((a, b) => a.d - b.d)
}

const boxIndex = Object.fromEntries(CCS.map((cc) => [cc, readJson<Index>(join(DATA, cc, 'index.json'))])) as Record<CC, Index | undefined>
const stampIndex = Object.fromEntries(CCS.map((cc) => [cc, readJson<Index>(join(DATA, cc, 'stamps', 'index.json'))])) as Record<CC, Index | undefined>

interface CityData { city: City; stats: Stats; offices: { name: string; hours?: string; raw?: string }[] }

function analyse(city: City): CityData {
  const boxes = around(city, '', boxIndex[city.cc])
  const stamps = around(city, 'stamps/', stampIndex[city.cc])
  let withTimes = 0
  let saturday = 0
  let latest = -1
  for (const { f } of boxes) {
    const week = parseHours(f.properties.collection_times)
    if (!week) continue
    withTimes++
    if (week[5].length) saturday++
    for (let d = 0; d < 5; d++) for (const s of week[d]) latest = Math.max(latest, s.start)
  }
  const kinds: Stats['kinds'] = {}
  for (const { f } of stamps) {
    const k = f.properties.kind as keyof Stats['kinds']
    if (k) kinds[k] = (kinds[k] ?? 0) + 1
  }
  // Oficines amb horari conegut (sense horari, «Correos» repetit no aporta res); sense duplicats
  const seen = new Set<string>()
  const offices = stamps
    .filter(({ f }) => f.properties.kind === 'post_office' && f.properties.name && parseHours(f.properties.opening_hours))
    .filter(({ f }) => {
      const k = `${f.properties.name}|${f.properties.opening_hours}`
      return !seen.has(k) && !!seen.add(k)
    })
    .slice(0, 8)
    .map(({ f }) => ({ name: f.properties.name!, raw: f.properties.opening_hours }))
  return {
    city,
    stats: { boxes: boxes.length, withTimes, saturday, latest: latest >= 0 ? fmtTime(latest) : undefined, stamps: stamps.length, kinds },
    offices,
  }
}

// ── HTML ─────────────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
const cityPath = (lang: Lang, c: City) => `/${lang}/${STRINGS[lang].slug}/${c.slug}/`
const mapUrl = (lang: Lang, c?: City) =>
  c ? `${SITE}/?at=${c.lat},${c.lng}&z=${c.r >= 5 ? 13 : 14}&lang=${lang}` : `${SITE}/?lang=${lang}`
const fmtDate = (iso: string | undefined, lang: Lang) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) : ''

function page(o: {
  lang: Lang
  cc: CC
  path: string
  title: string
  desc: string
  alternates: { lang: Lang | 'x-default'; path: string }[]
  body: string
  jsonld: object[]
}) {
  const S = STRINGS[o.lang]
  const col = COLORS[o.cc]
  const alt = o.alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${SITE}${a.path}">`).join('\n    ')
  return `<!doctype html>
<html lang="${o.lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(o.title)}</title>
    <meta name="description" content="${esc(o.desc)}">
    <link rel="canonical" href="${SITE}${o.path}">
    ${alt}
    <meta name="theme-color" content="#F7F2E6">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="POSTAL">
    <meta property="og:title" content="${esc(o.title)}">
    <meta property="og:description" content="${esc(o.desc)}">
    <meta property="og:url" content="${SITE}${o.path}">
    <meta property="og:image" content="${SITE}/og.png">
    <meta property="og:locale" content="${S.locale}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/png" sizes="32x32" href="${SITE}/favicon-32.png">
    <link rel="apple-touch-icon" href="${SITE}/apple-touch-icon.png">
    ${o.jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n    ')}
    <style>
      :root { --paper:#F7F2E6; --ink:#2C4BA0; --soft:#56607A; --primary:${col.primary}; --on-primary:${col.onPrimary}; --accent:${col.accent}; }
      * { box-sizing: border-box; }
      body { margin:0; background:var(--paper); color:#1F2A44; font:17px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; }
      .stripes { height:8px; background:repeating-linear-gradient(-45deg,var(--accent) 0 25%,var(--paper) 25% 50%,var(--ink) 50% 75%,var(--paper) 75% 100%); background-size:32px 8px; }
      header, main, footer { max-width:760px; margin:0 auto; padding:0 20px; }
      header { display:flex; align-items:center; gap:12px; padding-top:18px; }
      header a.logo { display:flex; align-items:center; gap:10px; color:var(--ink); text-decoration:none; font-weight:800; letter-spacing:.14em; font-size:22px; text-shadow:2px 1.5px 0 var(--primary); }
      header img { width:40px; height:40px; }
      nav.crumbs { font-size:14px; color:var(--soft); margin:18px 0 0; }
      nav.crumbs a { color:var(--soft); }
      h1 { color:var(--ink); font-size:clamp(30px,6vw,44px); line-height:1.12; margin:14px 0 10px; text-shadow:2.5px 2px 0 var(--primary); }
      h2 { color:var(--ink); font-size:22px; margin:36px 0 8px; }
      p.lead { font-size:19px; }
      a { color:var(--ink); }
      .cta { display:inline-block; margin:10px 0 6px; padding:13px 22px; background:var(--ink); color:var(--paper); border-radius:999px; font-weight:700; text-decoration:none; box-shadow:3px 3px 0 var(--primary); }
      .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin:22px 0 4px; padding:0; list-style:none; }
      .stats li { border:1.5px solid var(--ink); border-radius:14px; padding:12px 14px; background:#fff8; }
      .stats b { display:block; font-size:28px; color:var(--ink); line-height:1.1; }
      .stats span { font-size:14px; color:var(--soft); }
      ul.offices { padding:0; list-style:none; }
      ul.offices li { padding:10px 0; border-bottom:1px dashed #2C4BA055; }
      ul.offices small { display:block; color:var(--soft); }
      ol.how { padding-left:22px; }
      details { border-bottom:1px dashed #2C4BA055; padding:10px 0; }
      summary { cursor:pointer; font-weight:700; color:var(--ink); }
      .links { display:flex; flex-wrap:wrap; gap:8px; padding:0; list-style:none; }
      .links a { display:inline-block; padding:6px 12px; border:1.5px solid var(--ink); border-radius:999px; text-decoration:none; font-size:15px; background:#fff8; }
      footer { margin-top:48px; padding-bottom:40px; font-size:14px; color:var(--soft); }
      footer a { color:var(--soft); }
    </style>
  </head>
  <body>
    <div class="stripes"></div>
    <header><a class="logo" href="${SITE}/${o.lang}/"><img src="${SITE}/icon-192.png" alt="" width="40" height="40">POSTAL</a></header>
    <main>
${o.body}
    </main>
    <footer>
      <p>${S.credits} · <a href="${SITE}/privacy.html?lang=${o.lang}">${S.privacy}</a></p>
      ${o.alternates.filter((a) => a.lang !== 'x-default' && a.lang !== o.lang).length ? `<p>${S.otherLangs}: ${o.alternates.filter((a) => a.lang !== 'x-default' && a.lang !== o.lang).map((a) => `<a href="${SITE}${a.path}" hreflang="${a.lang}">${LANG_NAMES[a.lang as Lang]}</a>`).join(' · ')}</p>` : ''}
    </footer>
  </body>
</html>
`
}

function cityPage(lang: Lang, d: CityData, published: CityData[]) {
  const S = STRINGS[lang]
  const c = d.city
  const name = cityName(c, lang)
  const s = d.stats
  const faq = S.faq(name, s, c.cc)
  const nearby = published
    .filter((o) => o.city.cc === c.cc && o.city !== c && cityLangs(o.city).includes(lang))
    .map((o) => ({ o, d: km(c, o.city) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
  const offices = d.offices.map((o) => {
    const week = parseHours(o.raw)
    return `<li><b>${esc(o.name)}</b>${week ? `<small>${esc(formatWeek(week, lang))}</small>` : o.raw ? `<small>${esc(o.raw)}</small>` : ''}</li>`
  })
  const body = `
      <nav class="crumbs"><a href="${SITE}/${lang}/">${S.home}</a> › ${esc(S.countries[c.cc])} › ${esc(name)}</nav>
      <h1>${esc(S.cityH1(name))}</h1>
      <p class="lead">${esc(S.cityIntro(name, s, c.r))}</p>
      <a class="cta" href="${mapUrl(lang, c)}">${esc(S.openMapCity(name))} →</a>
      <ul class="stats">
        <li><b>${s.boxes.toLocaleString(lang)}</b><span>${S.statBoxes}</span></li>
        ${s.withTimes ? `<li><b>${s.withTimes.toLocaleString(lang)}</b><span>${S.statTimes}</span></li>` : ''}
        ${s.latest ? `<li><b>${s.latest}</b><span>${S.statLatest}</span></li>` : ''}
        ${s.saturday ? `<li><b>${s.saturday.toLocaleString(lang)}</b><span>${S.statSaturday}</span></li>` : ''}
        ${s.stamps ? `<li><b>${s.stamps.toLocaleString(lang)}</b><span>${S.statStamps}</span></li>` : ''}
      </ul>
      ${s.stamps ? `<h2>${esc(S.stampsH(name))}</h2>\n      <p>${esc(S.stampsText(name, s, c.cc))}</p>` : ''}
      ${offices.length >= 2 ? `<h2>${esc(S.officesH(name))}</h2>\n      <ul class="offices">${offices.join('')}</ul>` : ''}
      <h2>${S.faqH}</h2>
      ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n      ')}
      ${nearby.length ? `<h2>${S.nearby}</h2>\n      <ul class="links">${nearby.map(({ o }) => `<li><a href="${SITE}${cityPath(lang, o.city)}">${esc(cityName(o.city, lang))}</a></li>`).join('')}</ul>` : ''}
      <p><a class="cta" href="${mapUrl(lang, c)}">${esc(S.openMap)} →</a></p>
      <p><small>${esc(S.updated(fmtDate(boxIndex[c.cc]?.updated, lang)))}</small></p>`
  const langs = cityLangs(c)
  return page({
    lang,
    cc: c.cc,
    path: cityPath(lang, c),
    title: S.cityTitle(name),
    desc: S.cityDesc(name, s),
    alternates: [...langs.map((l) => ({ lang: l, path: cityPath(l, c) })), { lang: 'x-default', path: cityPath(langs[0], c) }],
    body,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'POSTAL', item: `${SITE}/${lang}/` },
          { '@type': 'ListItem', position: 2, name: S.cityH1(name), item: `${SITE}${cityPath(lang, c)}` },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  })
}

const appJsonLd = (lang: Lang) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'POSTAL',
  url: `${SITE}/`,
  description: STRINGS[lang].homeDesc,
  applicationCategory: 'TravelApplication',
  operatingSystem: 'Web, Android, iOS',
  inLanguage: LANGS,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  author: { '@type': 'Person', name: ABOUT.author, url: ABOUT.url },
  publisher: { '@type': 'Organization', name: ABOUT.company },
})

function homePage(lang: Lang, published: CityData[]) {
  const S = STRINGS[lang]
  const groups = CCS.map((cc) => ({
    cc,
    cities: published
      .filter((d) => d.city.cc === cc && cityLangs(d.city).includes(lang))
      .sort((a, b) => cityName(a.city, lang).localeCompare(cityName(b.city, lang), lang)),
  })).filter((g) => g.cities.length)
  // primer el país de l'idioma
  groups.sort((a, b) => Number(b.cc === HOME_CC[lang]) - Number(a.cc === HOME_CC[lang]))
  const body = `
      <h1>${esc(S.homeH1)}</h1>
      <p class="lead">${esc(S.homeIntro)}</p>
      <a class="cta" href="${mapUrl(lang)}">${esc(S.openMap)} →</a>
      <ol class="how">${S.homeHow.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
      ${groups
        .map(
          (g) =>
            `<h2>${esc(S.citiesOf(S.countries[g.cc]))}</h2>\n      <ul class="links">${g.cities
              .map((d) => `<li><a href="${SITE}${cityPath(lang, d.city)}">${esc(cityName(d.city, lang))}</a></li>`)
              .join('')}</ul>`,
        )
        .join('\n      ')}`
  return page({
    lang,
    cc: HOME_CC[lang],
    path: `/${lang}/`,
    title: S.homeTitle,
    desc: S.homeDesc,
    alternates: [...LANGS.map((l) => ({ lang: l, path: `/${l}/` })), { lang: 'x-default', path: '/' }],
    body,
    jsonld: [appJsonLd(lang)],
  })
}

// ── Escriure ─────────────────────────────────────
function write(path: string, content: string) {
  const file = join(OUT, path.endsWith('/') ? `${path}index.html` : path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

const published = CITIES.map(analyse).filter((d) => d.stats.boxes >= MIN_BOXES)
const urls: { path: string; alternates: { lang: string; path: string }[] }[] = []

for (const lang of LANGS) {
  write(`/${lang}/`, homePage(lang, published))
  urls.push({ path: `/${lang}/`, alternates: [...LANGS.map((l) => ({ lang: l, path: `/${l}/` })), { lang: 'x-default', path: '/' }] })
}
for (const d of published) {
  const langs = cityLangs(d.city)
  const alternates = [...langs.map((l) => ({ lang: l, path: cityPath(l, d.city) })), { lang: 'x-default', path: cityPath(langs[0], d.city) }]
  for (const lang of langs) {
    write(cityPath(lang, d.city), cityPage(lang, d, published))
    urls.push({ path: cityPath(lang, d.city), alternates })
  }
}

// Portada (l'aplicació): metaetiquetes, idiomes i contingut per a qui no executa JavaScript
const indexFile = join(OUT, 'index.html')
if (existsSync(indexFile)) {
  const S = STRINGS.ca
  const head = `
    <link rel="canonical" href="${SITE}/">
    ${LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/">`).join('\n    ')}
    <link rel="alternate" hreflang="x-default" href="${SITE}/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="POSTAL">
    <meta property="og:title" content="${esc(STRINGS.en.homeTitle)}">
    <meta property="og:description" content="${esc(STRINGS.en.homeDesc)}">
    <meta property="og:url" content="${SITE}/">
    <meta property="og:image" content="${SITE}/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${JSON.stringify(appJsonLd('en'))}</script>
  </head>`
  const noscript = `<noscript>
      <main style="max-width:720px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;color:#2C4BA0">
        <h1>${esc(S.homeH1)}</h1>
        <p>${esc(S.homeIntro)}</p>
        <ul>${LANGS.map((l) => `<li><a href="${SITE}/${l}/" hreflang="${l}">${esc(STRINGS[l].homeH1)} (${LANG_NAMES[l]})</a></li>`).join('')}</ul>
      </main>
    </noscript>
    <div id="app"></div>`
  const html = readFileSync(indexFile, 'utf8').replace('</head>', head).replace('<div id="app"></div>', noscript)
  writeFileSync(indexFile, html)
  urls.unshift({ path: '/', alternates: [] })
}

const lastmod = CCS.map((cc) => boxIndex[cc]?.updated).filter(Boolean).sort().pop()
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE}${u.path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
${u.alternates.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${SITE}${a.path}"/>`).join('\n')}
  </url>`,
  )
  .join('\n')}
</urlset>
`
writeFileSync(join(OUT, 'sitemap.xml'), sitemap)
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

const skipped = CITIES.length - published.length
console.log(`SEO: ${published.length} ciutats (${skipped} sense prou bústies), ${urls.length} pàgines · ${SITE}`)
