import { describe, it, expect } from 'vitest'
import { snapToRoute, pointAlong, bearing } from './navigation'

// Línia recta cap a l'est de ~850 m al llarg de la Gran Via
const line: [number, number][] = [[2.160, 41.385], [2.170, 41.385]]

describe('navigation', () => {
  it('projecta la posició sobre la ruta', () => {
    const s = snapToRoute({ lng: 2.165, lat: 41.3852 }, line)
    expect(s.offRoute).toBeGreaterThan(15)
    expect(s.offRoute).toBeLessThan(30)
    expect(s.along / (s.along + s.remaining)).toBeCloseTo(0.5, 1)
  })
  it('avança per la ruta i dona el rumb', () => {
    const { point, heading } = pointAlong(line, 100)
    expect(point.lng).toBeGreaterThan(2.160)
    expect(heading).toBeCloseTo(90, 0)
    expect(bearing({ lng: 0, lat: 0 }, { lng: 0, lat: 1 })).toBeCloseTo(0, 5)
  })
})
