import { t, lang, type MessageKey } from '../i18n'
import { parseHours, formatWeek, nextCollection, openStatus, fmtTime, dayName } from './hours'
import type { PostboxProps } from './geo'

const KIND_LABEL: Record<NonNullable<PostboxProps['kind']>, MessageKey> = {
  tobacco: 'kindTobacco',
  post_office: 'kindPostOffice',
  post_partner: 'kindPostPartner',
  vending: 'kindVending',
}

export const isShop = (p: PostboxProps) => !!p.kind

export function kindLabel(p: PostboxProps) {
  return p.kind ? t(KIND_LABEL[p.kind]) : t('postbox')
}

/** Títol d'un lloc a la llista o a la fitxa. */
export function placeTitle(p: PostboxProps) {
  if (isShop(p)) return p.name || kindLabel(p)
  return p.operator || t('postbox')
}

/** Línia d'estat: propera recollida (bústies) o obert/tancat (botigues). */
export function placeStatus(p: PostboxProps, now = new Date()): { text: string; good?: boolean } {
  if (isShop(p)) {
    const week = parseHours(p.opening_hours)
    if (!week) return { text: p.opening_hours || t('hoursUnknown') }
    const s = openStatus(week, now)
    if (s.open) return { text: t('openUntil', { time: fmtTime(s.until) }), good: true }
    if (!s.opens) return { text: t('closedNow'), good: false }
    const time = fmtTime(s.opens.time)
    if (s.opens.today) return { text: t('closedOpensToday', { time }), good: false }
    if (s.opens.tomorrow) return { text: t('closedOpensTomorrow', { time }), good: false }
    return { text: t('closedOpensDay', { day: dayName(s.opens.day, lang.value), time }), good: false }
  }
  const week = parseHours(p.collection_times)
  if (!week) return { text: p.collection_times || t('unknownTimes') }
  const c = nextCollection(week, now)
  if (!c) return { text: t('unknownTimes') }
  const time = fmtTime(c.time)
  if (c.kind === 'today') return { text: t('collectToday', { time }), good: true }
  if (c.tomorrow) return { text: t('collectTomorrow', { time }) }
  return { text: t('collectDay', { day: dayName(c.day, lang.value), time }) }
}

/** Horari complet resumit per a la fitxa («dl.–dv. 14:00 · ds. 12:00»). */
export function placeWeek(p: PostboxProps): string | undefined {
  const raw = isShop(p) ? p.opening_hours : p.collection_times
  const week = parseHours(raw)
  return week ? formatWeek(week, lang.value) : raw
}
