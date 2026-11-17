import { describe, it, expect } from 'vitest'
import { detectCountry } from './countries'

describe('detectCountry', () => {
  it.each([
    ['Barcelona', 41.387, 2.17, 'es'],
    ['Madrid', 40.417, -3.704, 'es'],
    ['Badajoz', 38.879, -6.97, 'es'],
    ['Vigo', 42.24, -8.72, 'es'],
    ['Las Palmas', 28.124, -15.43, 'es'],
    ['Palma', 39.57, 2.65, 'es'],
    ['Lisboa', 38.722, -9.139, 'pt'],
    ['Porto', 41.15, -8.61, 'pt'],
    ['Elvas', 38.88, -7.16, 'pt'],
    ['Faro', 37.02, -7.93, 'pt'],
    ['Funchal', 32.65, -16.91, 'pt'],
    ['Ponta Delgada', 37.74, -25.67, 'pt'],
    ['Perpinyà', 42.69, 2.89, undefined],
    ['Tolosa', 43.6, 1.44, undefined],
    ['París', 48.86, 2.35, undefined],
  ])('%s', (_name, lat, lng, expected) => {
    expect(detectCountry({ lat, lng })).toBe(expected)
  })
})
