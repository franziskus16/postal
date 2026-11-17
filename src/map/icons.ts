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

/** Segell amb perforacions i un sobre al centre. */
function stamp(P: Theme, body: string, fg: string) {
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

  // sobre
  const ex = x + 8.5, ey = y + 10, ew = S - 19, eh = S - 22
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.strokeStyle = fg
  ctx.strokeRect(ex, ey, ew, eh)
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex + ew / 2, ey + eh * 0.6)
  ctx.lineTo(ex + ew, ey)
  ctx.stroke()
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

/** Rètol d'un lloc on comprar segells: forma i lletra segons el tipus. */
function shopBadge(P: Theme, kind: 'tobacco' | 'post_office' | 'post_partner' | 'vending') {
  const S = 30
  const { c, ctx } = canvas(S + 4, S + 4)
  const x = 2, y = 2, w = S - 2
  // ombra desplaçada, com els segells
  ctx.fillStyle = P.ink
  ctx.globalAlpha = 0.25
  ctx.beginPath()
  shape(ctx, kind, x + 2, y + 2, w)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = kind === 'tobacco' ? P.ink : kind === 'vending' ? P.paper : P.primary
  ctx.strokeStyle = P.ink
  ctx.lineWidth = 1.6
  ctx.beginPath()
  shape(ctx, kind, x, y, w)
  ctx.fill()
  if (kind === 'post_partner') ctx.setLineDash([3, 2])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = kind === 'tobacco' ? P.paper : kind === 'vending' ? P.ink : P.onPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${kind === 'tobacco' ? 16 : 14}px system-ui, sans-serif`
  const glyph = { tobacco: 'T', post_office: '✉', post_partner: '✉', vending: '€' }[kind]
  ctx.fillText(glyph, x + w / 2, y + w / 2 + 1)
  return toImage(c)
}

function shape(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, w: number) {
  if (kind === 'tobacco') {
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
  // cada país amb el color de les seves bústies, sigui quin sigui el tema actiu
  for (const [code, th] of Object.entries(THEMES)) add(`postal-stamp-${code}`, stamp(P, th.primary, th.onPrimary))
  add('postal-stamp-blue', stamp(P, BLUE_BOX, P.paper))
  add('postal-stamp-selected', stamp(P, P.accent, P.onAccent))
  add('postal-postmark', postmark(P))
  add('postal-dots', dots(P))
  for (const kind of ['tobacco', 'post_office', 'post_partner', 'vending'] as const) add(`postal-shop-${kind}`, shopBadge(P, kind))
}
