import { describe, it, expect } from 'vitest'
import { parseHours, formatWeek, nextCollection, openStatus } from './hours'

// 2026-11-17 és dimarts
const tue = (h: number, m = 0) => new Date(2026, 10, 17, h, m)

describe('parseHours', () => {
  it('entén les hores de recollida habituals', () => {
    const w = parseHours('Mo-Fr 14:00, Sa 12:00')!
    expect(w[0]).toEqual([{ start: 840, end: undefined }])
    expect(w[5]).toEqual([{ start: 720, end: undefined }])
    expect(w[6]).toEqual([])
    expect(parseHours('Mo-Fr 09:00; Sa 09:00')![5][0].start).toBe(540)
    expect(parseHours('Mo-Sa 11:00')![6]).toEqual([])
    expect(parseHours('Mo-Fr 09:00,17:00')![1]).toHaveLength(2)
  })

  it('entén horaris de botigues', () => {
    const w = parseHours('Mo-Fr 09:00-14:00,17:00-20:00; Sa 10:00-13:30; Su off')!
    expect(w[2]).toEqual([{ start: 540, end: 840 }, { start: 1020, end: 1200 }])
    expect(w[5]).toEqual([{ start: 600, end: 810 }])
    expect(w[6]).toEqual([])
    expect(parseHours('24/7')![3][0]).toEqual({ start: 0, end: 1440 })
    expect(parseHours('09:00-21:00')![6]).toHaveLength(1)
  })

  it('no s’inventa res si no ho entén', () => {
    expect(parseHours('Jan-Mar Mo-Fr 10:00')).toBeNull()
    expect(parseHours('sunrise-sunset')).toBeNull()
    expect(parseHours('')).toBeNull()
    expect(parseHours(undefined)).toBeNull()
  })
})

describe('formatWeek', () => {
  it('agrupa dies en l’idioma', () => {
    const w = parseHours('Mo-Fr 14:00, Sa 12:00')!
    const ca = formatWeek(w, 'ca')
    expect(ca).toContain('14:00')
    expect(ca).toContain('12:00')
    expect(ca.split(' · ')).toHaveLength(2)
    expect(formatWeek(w, 'en')).toMatch(/^Mon–Fri 14:00 · Sat 12:00$/)
  })
})

describe('estat', () => {
  const w = parseHours('Mo-Fr 14:00, Sa 12:00')!
  it('propera recollida', () => {
    expect(nextCollection(w, tue(10))).toEqual({ kind: 'today', time: 840 })
    expect(nextCollection(w, tue(15))).toEqual({ kind: 'later', day: 2, time: 840, tomorrow: true })
    const sat = new Date(2026, 10, 21, 13)
    expect(nextCollection(w, sat)).toEqual({ kind: 'later', day: 0, time: 840, tomorrow: false })
  })
  it('obert / tancat', () => {
    const shop = parseHours('Mo-Fr 09:00-14:00,17:00-20:00')!
    expect(openStatus(shop, tue(10))).toEqual({ open: true, until: 840 })
    expect(openStatus(shop, tue(15))).toEqual({ open: false, opens: { day: 1, time: 1020, today: true, tomorrow: false } })
    expect(openStatus(shop, tue(21))).toMatchObject({ open: false, opens: { day: 2, tomorrow: true } })
  })
})
