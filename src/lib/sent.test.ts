import { describe, expect, it } from 'vitest'
import { parseHours } from './hours'
import { addWorkdays, arrivalWindow, departure, sentStatus, type SentItem } from './sent'

// 18 nov 2026 és dimecres
const at = (d: number, h = 12, m = 0) => new Date(2026, 10, d, h, m)
const week = parseHours('Mo-Fr 17:10; Sa 12:00')!

describe('departure', () => {
  it('surt avui si encara no s’ha recollit', () => {
    expect(departure(week, at(18, 10))).toEqual(at(18, 17, 10))
  })
  it('surt demà si ja ha passat la recollida', () => {
    expect(departure(week, at(18, 19, 40))).toEqual(at(19, 17, 10))
  })
  it('divendres al vespre surt dissabte', () => {
    expect(departure(week, at(20, 20))).toEqual(at(21, 12, 0))
  })
  it('sense horari no ho sabem', () => {
    expect(departure(null, at(18))).toBeUndefined()
  })
})

describe('addWorkdays', () => {
  it('salta el cap de setmana', () => {
    expect(addWorkdays(at(20), 1)).toEqual(new Date(2026, 10, 23)) // dv → dl
    expect(addWorkdays(at(18), 3)).toEqual(new Date(2026, 10, 23)) // dc → dl
  })
})

const item = (over: Partial<SentItem> = {}): SentItem => ({
  id: 'x', kind: 'letter', dest: 'national', cc: 'es',
  postedAt: at(18, 10).getTime(), departAt: at(18, 17, 10).getTime(),
  box: { id: 'n1', lng: 2, lat: 41 }, ...over,
})

describe('arrivalWindow', () => {
  it('Espanya nacional: D+3 a D+5 laborables des de la sortida', () => {
    const [from, to] = arrivalWindow(item())
    expect(from).toEqual(new Date(2026, 10, 23))
    expect(to).toEqual(new Date(2026, 10, 25))
  })
})

describe('sentStatus', () => {
  it('passa per tots els estats', () => {
    const i = item()
    expect(sentStatus(i, at(18, 12)).kind).toBe('waiting')
    expect(sentStatus(i, at(19)).kind).toBe('transit')
    expect(sentStatus(i, at(24)).kind).toBe('due')
    expect(sentStatus(i, at(25, 22)).kind).toBe('due')
    expect(sentStatus(i, at(26, 9)).kind).toBe('late')
    expect(sentStatus({ ...i, receivedAt: at(23, 9).getTime() })).toEqual({ kind: 'received', days: 5 })
  })
})
