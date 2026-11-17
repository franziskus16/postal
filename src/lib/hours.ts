/**
 * Horaris d'OpenStreetMap llegibles per a persones.
 *  - collection_times (bústies): hores puntuals, p. ex. «Mo-Fr 14:00, Sa 12:00»
 *  - opening_hours (botigues): franges, p. ex. «Mo-Fr 09:00-14:00,17:00-20:00; Sa 10:00-13:00»
 * Entén els casos habituals; si no l'entén, retorna null i es mostra el text original.
 */

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

export interface Slot {
  start: number // minuts des de mitjanit
  end?: number // només a opening_hours
}

/** Horari per dia de la setmana (0 = dilluns … 6 = diumenge). */
export type Week = Slot[][]

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function parseDays(spec: string): number[] | null {
  const days = new Set<number>()
  for (const part of spec.split(',').map((s) => s.trim())) {
    if (part === 'PH' || part === 'SH') continue // festius: no els tenim en compte
    const [a, b] = part.split('-')
    const i = DAYS.indexOf(a as (typeof DAYS)[number])
    if (i < 0) return null
    if (!b) {
      days.add(i)
      continue
    }
    const j = DAYS.indexOf(b as (typeof DAYS)[number])
    if (j < 0) return null
    for (let k = i; ; k = (k + 1) % 7) {
      days.add(k)
      if (k === j) break
    }
  }
  return [...days]
}

function parseSlots(spec: string): Slot[] | null {
  const slots: Slot[] = []
  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?$/)
    if (!m) return null
    slots.push({ start: toMin(m[1]), end: m[2] ? toMin(m[2]) : undefined })
  }
  return slots
}

const DAY_RE = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)'
const RULE_RE = new RegExp(
  `(${DAY_RE}(?:\\s*[-,]\\s*${DAY_RE})*)?\\s*(off|closed|\\d{1,2}:\\d{2}(?:-\\d{1,2}:\\d{2})?(?:\\s*,\\s*\\d{1,2}:\\d{2}(?:-\\d{1,2}:\\d{2})?)*)`,
  'g',
)

export function parseHours(raw?: string): Week | null {
  if (!raw) return null
  const text = raw.trim()
  if (text === '24/7') return Array.from({ length: 7 }, () => [{ start: 0, end: 24 * 60 }])

  const week: Week = Array.from({ length: 7 }, () => [])
  let matched = ''
  for (const rule of text.split(';').map((r) => r.trim()).filter(Boolean)) {
    RULE_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = RULE_RE.exec(rule))) {
      if (!m[0].trim()) {
        RULE_RE.lastIndex++
        continue
      }
      matched += m[0]
      const days = m[1] ? parseDays(m[1].replace(/\s/g, '')) : [0, 1, 2, 3, 4, 5, 6]
      if (!days) return null
      if (m[2] === 'off' || m[2] === 'closed') {
        for (const d of days) week[d] = []
        continue
      }
      const slots = parseSlots(m[2].replace(/\s/g, ''))
      if (!slots) return null
      for (const d of days) week[d] = slots // la regla posterior mana, com a OSM
    }
  }
  // Si hi ha coses que no hem entès (mesos, «sunrise»…), millor no inventar
  const leftover = text.replace(/[;,\s]/g, '').length - matched.replace(/[;,\s]/g, '').length
  if (leftover > 0 || week.every((d) => !d.length)) return null
  return week
}

/** Dia de la setmana a l'estil OSM (0 = dilluns). */
const osmDay = (d: Date) => (d.getDay() + 6) % 7
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

export const fmtTime = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Nom curt del dia en l'idioma donat (0 = dilluns). */
export function dayName(day: number, lang: string) {
  // 2024-01-01 era dilluns
  return new Date(2024, 0, 1 + day).toLocaleDateString(lang, { weekday: 'short' })
}

/** Horari resumit: agrupa els dies seguits amb les mateixes hores. «dl.–dv. 14:00 · ds. 12:00» */
export function formatWeek(week: Week, lang: string): string {
  const key = (slots: Slot[]) => slots.map((s) => (s.end !== undefined ? `${fmtTime(s.start)}–${fmtTime(s.end)}` : fmtTime(s.start))).join(', ')
  const parts: string[] = []
  let i = 0
  while (i < 7) {
    const k = key(week[i])
    let j = i
    while (j + 1 < 7 && key(week[j + 1]) === k) j++
    if (k) parts.push(`${i === j ? dayName(i, lang) : `${dayName(i, lang)}–${dayName(j, lang)}`} ${k}`)
    i = j + 1
  }
  return parts.join(' · ')
}

export type CollectionStatus =
  | { kind: 'today'; time: number } // encara es recull avui
  | { kind: 'later'; day: number; time: number; tomorrow: boolean } // avui ja s'ha recollit o no es recull

/** Propera recollida d'una bústia. */
export function nextCollection(week: Week, now = new Date()): CollectionStatus | null {
  const today = osmDay(now)
  const later = week[today].filter((s) => s.start > minutesOf(now)).sort((a, b) => a.start - b.start)
  if (later.length) return { kind: 'today', time: later[0].start }
  for (let k = 1; k <= 7; k++) {
    const d = (today + k) % 7
    if (week[d].length) {
      const first = Math.min(...week[d].map((s) => s.start))
      return { kind: 'later', day: d, time: first, tomorrow: k === 1 }
    }
  }
  return null
}

export type OpenStatus =
  | { open: true; until: number }
  | { open: false; opens?: { day: number; time: number; today: boolean; tomorrow: boolean } }

/** Si una botiga és oberta ara, i fins quan (o quan obre). */
export function openStatus(week: Week, now = new Date()): OpenStatus {
  const today = osmDay(now)
  const t = minutesOf(now)
  for (const s of week[today]) if (s.end !== undefined && t >= s.start && t < s.end) return { open: true, until: s.end }
  // franges que passen de mitjanit (p. ex. 18:00-02:00) del dia anterior
  for (const s of week[(today + 6) % 7]) if (s.end !== undefined && s.end < s.start && t < s.end) return { open: true, until: s.end }
  for (let k = 0; k <= 7; k++) {
    const d = (today + k) % 7
    const starts = week[d].map((s) => s.start).filter((st) => k > 0 || st > t)
    if (starts.length) return { open: false, opens: { day: d, time: Math.min(...starts), today: k === 0, tomorrow: k === 1 } }
  }
  return { open: false }
}
