import { t, lang } from '../i18n'
import { fmtTime } from './hours'
import { sentStatus, type SentItem } from './sent'

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** «avui 17:10», «demà 17:10», «dj. 17:10» */
export function fmtWhen(d: Date, now = new Date()): string {
  const time = fmtTime(d.getHours() * 60 + d.getMinutes())
  if (sameDay(d, now)) return `${t('today')} ${time}`
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (sameDay(d, tomorrow)) return `${t('tomorrow')} ${time}`
  return `${d.toLocaleDateString(lang.value, { weekday: 'short' })} ${time}`
}

/** «dl. 23 nov.» (sense comes ni preposicions, perquè encaixi en qualsevol frase) */
export const fmtDay = (d: Date) => {
  const wd = d.toLocaleDateString(lang.value, { weekday: 'short' })
  const month = d.toLocaleDateString(lang.value, { month: 'short' }).replace(/^de /, '').replace(/\.$/, '')
  return `${wd} ${d.getDate()} ${month}`
}

export function sentStatusText(item: SentItem, now = new Date()): { text: string; tone?: 'good' | 'bad' } {
  const s = sentStatus(item, now)
  switch (s.kind) {
    case 'waiting':
      return { text: t('stWaiting', { when: fmtWhen(s.departAt, now) }) }
    case 'transit':
      return { text: t('stTransit', { from: fmtDay(s.from), to: fmtDay(s.to) }) }
    case 'due':
      return { text: t('stDue', { from: fmtDay(s.from), to: fmtDay(s.to) }), tone: 'good' }
    case 'late':
      return { text: t('stLate', { to: fmtDay(s.to) }), tone: 'bad' }
    case 'received':
      return { text: s.days === 1 ? t('stReceived1') : t('stReceived', { n: s.days }), tone: 'good' }
  }
}

/** Data i hora curtes per al mata-segells de la llista: «18 NOV · 19:40» */
export function postmarkOf(item: SentItem) {
  const d = new Date(item.postedAt)
  const month = d.toLocaleDateString(lang.value, { month: 'short' }).replace('.', '').toUpperCase()
  return { day: `${d.getDate()} ${month}`, time: fmtTime(d.getHours() * 60 + d.getMinutes()) }
}
