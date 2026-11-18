/**
 * «Enviades»: les cartes i postals que has deixat a la bústia.
 * Tot es desa només al dispositiu (localStorage); no surt enlloc.
 *
 * No hi ha seguiment real (les cartes ordinàries no en tenen): calculem
 *  1. quan surt de la bústia: la propera recollida segons l'horari de la bústia
 *  2. quan hauria d'arribar: dies laborables segons els terminis habituals de l'operador
 */
import type { Week } from './hours'
import type { ThemeCode } from '../map/themes'

export type Dest = 'national' | 'europe' | 'world'
export type MailKind = 'letter' | 'postcard'

export interface SentItem {
  id: string
  kind: MailKind
  to?: string
  dest: Dest
  cc: ThemeCode // país des d'on s'envia (operador)
  postedAt: number // quan la vas deixar (ms)
  departAt?: number // propera recollida, si la bústia té horari
  box: { id: string; lng: number; lat: number }
  receivedAt?: number
}

/**
 * Terminis orientatius en dies laborables (dl.–dv.) comptats després del dia de sortida.
 * [mínim, màxim]. Fonts (nov. 2026):
 *  - Correos, carta ordinària nacional: objectiu D+3 (93 %) i D+5 (99 %) — CNMC
 *  - La Poste, Lettre verte: J+3 indicatiu, menys d'un 1 % més enllà de J+5
 *  - CTT, correio normal: 3 dies útils al continent; Europa ~5, resta del món ~7
 *  - Poste Italiane, Posta4: 4 dies laborables (90 %); Postamail Internacional Europa 8 dies (85 %),
 *    resta del món fins a 12–22
 * La internacional depèn molt del país de destí; els marges són amples a propòsit.
 */
export const TRANSIT: Record<ThemeCode, Record<Dest, [number, number]>> = {
  es: { national: [3, 5], europe: [4, 8], world: [7, 15] },
  fr: { national: [3, 5], europe: [4, 8], world: [7, 15] },
  pt: { national: [3, 5], europe: [5, 8], world: [7, 15] },
  it: { national: [4, 6], europe: [6, 10], world: [10, 22] },
}

const DAY = 86_400_000
const osmDay = (d: Date) => (d.getDay() + 6) % 7 // 0 = dilluns

/** Propera recollida després de `posted` segons l'horari de la bústia. */
export function departure(week: Week | null, posted: Date): Date | undefined {
  if (!week) return undefined
  const minutes = posted.getHours() * 60 + posted.getMinutes()
  for (let k = 0; k <= 7; k++) {
    const day = new Date(posted.getFullYear(), posted.getMonth(), posted.getDate() + k)
    const starts = week[osmDay(day)].map((s) => s.start).filter((m) => k > 0 || m > minutes).sort((a, b) => a - b)
    if (starts.length) return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, starts[0])
  }
  return undefined
}

/** `n` dies laborables (dl.–dv.) després del dia de `from`. Retorna l'inici del dia. */
export function addWorkdays(from: Date, n: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let left = n
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    if (osmDay(d) < 5) left--
  }
  return d
}

/** Finestra d'arribada estimada [primer dia, últim dia]. */
export function arrivalWindow(item: SentItem): [Date, Date] {
  const start = new Date(item.departAt ?? item.postedAt)
  // sense horari no sabem si ja s'ha recollit avui: comptem des de l'endemà
  const base = item.departAt ? start : addWorkdays(start, 1)
  const [min, max] = TRANSIT[item.cc][item.dest]
  return [addWorkdays(base, min), addWorkdays(base, max)]
}

export type SentStatus =
  | { kind: 'waiting'; departAt: Date } // encara és dins la bústia
  | { kind: 'transit'; from: Date; to: Date }
  | { kind: 'due'; from: Date; to: Date } // dins la finestra d'arribada
  | { kind: 'late'; to: Date }
  | { kind: 'received'; days: number }

export function sentStatus(item: SentItem, now = new Date()): SentStatus {
  if (item.receivedAt) {
    return { kind: 'received', days: Math.max(1, Math.round((startOfDay(item.receivedAt) - startOfDay(item.postedAt)) / DAY)) }
  }
  if (item.departAt && now.getTime() < item.departAt) return { kind: 'waiting', departAt: new Date(item.departAt) }
  const [from, to] = arrivalWindow(item)
  if (now < from) return { kind: 'transit', from, to }
  if (now.getTime() < to.getTime() + DAY) return { kind: 'due', from, to }
  return { kind: 'late', to }
}

function startOfDay(ms: number) {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

// ── Desar al dispositiu ──────────────────────────
const KEY = 'postal:sent'

export function loadSent(): SentItem[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveSent(list: SentItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sense emmagatzematge (navegació privada): es perd en tancar */
  }
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
