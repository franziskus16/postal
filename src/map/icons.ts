import type { Map as MLMap } from 'maplibre-gl'
import { BLUE_BOX, THEMES, type Theme } from './themes'

/**
 * Icones del mapa dibuixades amb canvas (sense sprites externs):
 *  - postal-stamp: cada bústia és un segell del color de les bústies del país
 *  - postal-stamp-blue: bústies blaves (Correio Azul a Portugal)
 *  - postal-postmark: els grups són un mata-segells (doble anell + ones)
 *  - postal-dots: trama de punts (semitò) per a l'aigua
 */

const DPR = 2

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w * DPR
  c.height = h * DPR
  const ctx = c.getContext('2d')!
  ctx.scale(DPR, DPR)
  return { c, ctx }
}

function toImage(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!
  return ctx.getImageData(0, 0, c.width, c.height)
}

export type Motif = 'envelope' | 'es' | 'pt' | 'fr' | 'it'

/**
 * Segell amb perforacions. A dins, la silueta de la bústia típica de cada país
 * (dibuix propi, no el logotip de l'operador):
 *  - es: bústia de carrer de Correos, cos arrodonit sobre una pota curta
 *  - pt: «marco do correio» de CTT, columna amb cúpula i ràfec
 *  - fr: bústia de La Poste, caixa amb la tapa inclinada sobre un pal
 *  - it: «cassetta» de Poste Italiane, caixa alta amb el capçal arrodonit sobre un peu
 */
function stamp(P: Theme, body: string, fg: string, motif: Motif = 'envelope') {
  const S = 30
  const { c, ctx } = canvas(S + 4, S + 4)
  const x = 2, y = 2
  const r = 2.2 // radi de les perforacions
  const step = 6

  // ombra desplaçada (efecte impressió)
  ctx.fillStyle = P.ink
  ctx.globalAlpha = 0.25
  ctx.fillRect(x + 2, y + 2, S - 2, S - 2)
  ctx.globalAlpha = 1

  // cos del segell
  ctx.fillStyle = body
  ctx.fillRect(x, y, S - 2, S - 2)

  // perforacions
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i <= S - 2; i += step) {
    for (const [cx, cy] of [
      [x + i, y], [x + i, y + S - 2], [x, y + i], [x + S - 2, y + i],
    ]) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'

  // marc interior, lleugerament desplaçat (registre riso)
  ctx.strokeStyle = fg
  ctx.lineWidth = 1
  ctx.strokeRect(x + 5.8, y + 5.6, S - 12, S - 12)

  ctx.fillStyle = fg
  ctx.strokeStyle = fg
  ctx.lineJoin = 'round'
  const cx = x + (S - 2) / 2
  if (motif === 'envelope') {
    const ex = x + 8.5, ey = y + 10, ew = S - 19, eh = S - 22
    ctx.lineWidth = 1.6
    ctx.strokeRect(ex, ey, ew, eh)
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex + ew / 2, ey + eh * 0.6)
    ctx.lineTo(ex + ew, ey)
    ctx.stroke()
  } else if (motif === 'es') {
    // cos amb la part de dalt rodona
    ctx.beginPath()
    ctx.moveTo(cx - 5, y + 19)
    ctx.lineTo(cx - 5, y + 13)
    ctx.arc(cx, y + 13, 5, Math.PI, 0)
    ctx.lineTo(cx + 5, y + 19)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(cx - 1.2, y + 19, 2.4, 3) // pota
    ctx.fillRect(cx - 3.5, y + 21.5, 7, 1.2) // base
    ctx.fillStyle = body
    ctx.fillRect(cx - 3, y + 12.5, 6, 1.3) // boca
  } else if (motif === 'pt') {
    ctx.beginPath()
    ctx.arc(cx, y + 10.5, 3.6, Math.PI, 0) // cúpula
    ctx.fill()
    ctx.fillRect(cx - 5.5, y + 10.5, 11, 1.6) // ràfec
    ctx.fillRect(cx - 4, y + 12, 8, 9) // columna
    ctx.fillRect(cx - 5, y + 21, 10, 1.6) // sòcol
    ctx.fillStyle = body
    ctx.fillRect(cx - 2.6, y + 14, 5.2, 1.2) // boca
  } else if (motif === 'fr') {
    ctx.beginPath()
    ctx.moveTo(cx - 5.5, y + 11.5)
    ctx.lineTo(cx + 5.5, y + 9.5) // tapa inclinada
    ctx.lineTo(cx + 5.5, y + 17.5)
    ctx.lineTo(cx - 5.5, y + 17.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(cx - 0.9, y + 17.5, 1.8, 5) // pal
    ctx.fillStyle = body
    ctx.fillRect(cx - 3.5, y + 13.3, 7, 1.2) // boca
  } else if (motif === 'it') {
    ctx.beginPath()
    ctx.moveTo(cx - 5, y + 19)
    ctx.lineTo(cx - 5, y + 11)
    ctx.quadraticCurveTo(cx - 5, y + 8.5, cx, y + 8.5) // capçal arrodonit
    ctx.quadraticCurveTo(cx + 5, y + 8.5, cx + 5, y + 11)
    ctx.lineTo(cx + 5, y + 19)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(cx - 3, y + 19, 6, 3) // peu
    ctx.fillStyle = body
    ctx.fillRect(cx - 3, y + 12, 6, 1.2) // dues boques, com les antigues cassette
    ctx.fillRect(cx - 3, y + 15, 6, 1.2)
  }
  return toImage(c)
}

/** Mata-segells: doble anell vermell amb línies ondulades. */
function postmark(P: Theme) {
  const W = 64, H = 44
  const { c, ctx } = canvas(W, H)
  const cx = W / 2, cy = H / 2, R = 18

  // ones de cancel·lació
  ctx.strokeStyle = P.stripe
  ctx.lineWidth = 1.4
  ctx.globalAlpha = 0.8
  for (const dy of [-7, 0, 7]) {
    ctx.beginPath()
    for (let px = 0; px <= W; px++) {
      const py = cy + dy + Math.sin(px / 4) * 1.6
      px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // disc de paper perquè el número es llegeixi
  ctx.fillStyle = P.paper
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, R - 4, 0, Math.PI * 2)
  ctx.stroke()
  return toImage(c)
}

/** Trama de punts (semitò) per a l'aigua. */
function dots(P: Theme) {
  const S = 6
  const { c, ctx } = canvas(S, S)
  ctx.fillStyle = P.ink
  ctx.globalAlpha = 0.35
  for (const [x, y] of [[1.5, 1.5], [4.5, 4.5]]) {
    ctx.beginPath()
    ctx.arc(x, y, 0.75, 0, Math.PI * 2)
    ctx.fill()
  }
  return toImage(c)
}

type ShopKind = 'tobacco' | 'post_office' | 'post_partner' | 'vending'

/** Colors propis de cada país per als rètols (inspirats en els operadors, sense logotips). */
const SHOP_COLORS: Record<string, Partial<Record<ShopKind, { bg: string; fg: string }>>> = {
  es: {
    post_office: { bg: '#FFD93B', fg: '#1F3A8F' }, // groc i blau, com les oficines de Correos
    tobacco: { bg: '#7A2E2A', fg: '#FFD93B' }, // rètol granat i groc dels estancs
  },
  pt: {
    post_office: { bg: '#E5402E', fg: '#F8F1EC' }, // vermell CTT
  },
  fr: {
    post_office: { bg: '#FFC20E', fg: '#1B2F86' }, // groc i blau de La Poste
    tobacco: { bg: '#D7262E', fg: '#F6F3EC' }, // la «carotte» vermella dels tabacs
  },
  it: {
    post_office: { bg: '#FFD200', fg: '#1B3A8C' }, // groc i blau, com les oficines de correus
    tobacco: { bg: '#1E2550', fg: '#F8F2E8' }, // la «T» blanca sobre blau fosc dels tabacchi
  },
}

/** Inicials de l'operador postal de cada país (text, no logotip). */
export const POST_INITIALS: Record<string, string> = { es: 'C', pt: 'CTT', fr: 'LP', it: 'PI' }

/** Rètol d'un lloc on comprar segells: forma, lletra i colors segons el tipus i el país. */
function shopBadge(P: Theme, kind: ShopKind, country: string) {
  const S = 30
  const { c, ctx } = canvas(S + 4, S + 4)
  const x = 2, y = 2, w = S - 2
  const office = SHOP_COLORS[country]?.post_office ?? { bg: P.primary, fg: P.onPrimary }
  const own = SHOP_COLORS[country]?.[kind]
  const colors =
    own ??
    (kind === 'tobacco'
      ? { bg: P.ink, fg: P.paper }
      : kind === 'post_partner'
        ? { bg: P.paper, fg: ['#FFD93B', '#FFC20E', '#FFD200'].includes(office.bg) ? office.fg : office.bg }
        : kind === 'vending'
          ? { bg: P.paper, fg: P.ink }
          : office)
  const form = kind === 'tobacco' && country === 'fr' ? 'carotte' : kind === 'tobacco' && country === 'it' ? 'sign' : kind

  // ombra desplaçada, com els segells
  ctx.fillStyle = P.ink
  ctx.globalAlpha = 0.25
  ctx.beginPath()
  shape(ctx, form, x + 2, y + 2, w)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = colors.bg
  ctx.strokeStyle = kind === 'post_partner' ? colors.fg : P.ink
  ctx.lineWidth = 1.6
  ctx.beginPath()
  shape(ctx, form, x, y, w)
  ctx.fill()
  if (kind === 'post_partner') ctx.setLineDash([3, 2])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = colors.fg
  ctx.strokeStyle = colors.fg
  if (kind === 'post_office' || kind === 'post_partner') {
    // inicials de l'operador del país, amb la nostra lletra i doble tinta riso
    const initials = POST_INITIALS[country] ?? '✉'
    const size = initials.length >= 3 ? 10.5 : initials.length === 2 ? 13 : 17
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${size}px system-ui, sans-serif`
    const cx = x + w / 2, cy = y + w / 2 + 1
    ctx.globalAlpha = 0.45
    ctx.fillStyle = kind === 'post_partner' ? P.primary : P.paper
    ctx.fillText(initials, cx + 1.2, cy + 1.1) // segona passada desplaçada
    ctx.globalAlpha = 1
    ctx.fillStyle = colors.fg
    ctx.fillText(initials, cx, cy)
  } else {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${kind === 'tobacco' ? 15 : 14}px system-ui, sans-serif`
    ctx.fillText(kind === 'tobacco' ? 'T' : '€', x + w / 2, y + w / 2 + 1)
  }
  return toImage(c)
}

function shape(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, w: number) {
  if (kind === 'carotte') {
    // rombe allargat, com la «carotte» dels bureaux de tabac
    ctx.moveTo(x + w / 2, y)
    ctx.lineTo(x + w * 0.82, y + w / 2)
    ctx.lineTo(x + w / 2, y + w)
    ctx.lineTo(x + w * 0.18, y + w / 2)
    ctx.closePath()
  } else if (kind === 'sign') {
    // rètol quadrat amb la «T», com els dels tabacchi
    ctx.rect(x + 2, y + 2, w - 4, w - 4)
  } else if (kind === 'tobacco') {
    // rombe, com el rètol dels estancs i la «carotte» dels tabacs francesos
    ctx.moveTo(x + w / 2, y)
    ctx.lineTo(x + w, y + w / 2)
    ctx.lineTo(x + w / 2, y + w)
    ctx.lineTo(x, y + w / 2)
    ctx.closePath()
  } else if (kind === 'vending') {
    ctx.rect(x + 4, y, w - 8, w)
  } else {
    ctx.rect(x + 1, y + 3, w - 2, w - 6)
  }
}

export function addPostalIcons(map: MLMap, P: Theme) {
  const add = (id: string, img: ImageData) => {
    if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: DPR })
  }
  add('postal-stamp', stamp(P, P.primary, P.onPrimary))
  // cada país amb el color i la silueta de les seves bústies, sigui quin sigui el tema actiu
  for (const [code, th] of Object.entries(THEMES)) {
    const motif = code as Motif
    add(`postal-stamp-${code}`, stamp(P, th.primary, th.onPrimary, motif))
    add(`postal-stamp-selected-${code}`, stamp(P, P.accent, P.onAccent, motif))
    for (const kind of ['tobacco', 'post_office', 'post_partner', 'vending'] as const)
      add(`postal-shop-${kind}-${code}`, shopBadge(P, kind, code))
  }
  add('postal-stamp-blue', stamp(P, BLUE_BOX, P.paper, 'pt')) // Correio Azul
  add('postal-stamp-selected', stamp(P, P.accent, P.onAccent))
  add('postal-postmark', postmark(P))
  add('postal-dots', dots(P))
}
