import { describe, it, expect } from 'vitest'
import { detectCountry } from './countries'

describe('detectCountry', () => {
  it.each([
    ['Barcelona', 41.387, 2.17, 'es'],
    ['Madrid', 40.417, -3.704, 'es'],
    ['Badajoz', 38.879, -6.97, 'es'],
    ['Vigo', 42.24, -8.72, 'es'],
    ['Tui', 42.047, -8.645, 'es'],
    ['Salvaterra de Miño', 42.09, -8.49, 'es'],
    ['Las Palmas', 28.124, -15.43, 'es'],
    ['Palma', 39.57, 2.65, 'es'],
    ['Lisboa', 38.722, -9.139, 'pt'],
    ['Porto', 41.15, -8.61, 'pt'],
    ['Valença', 42.027, -8.643, 'pt'],
    ['Monção', 42.076, -8.48, 'pt'],
    ['Elvas', 38.88, -7.16, 'pt'],
    ['Faro', 37.02, -7.93, 'pt'],
    ['Funchal', 32.65, -16.91, 'pt'],
    ['Ponta Delgada', 37.74, -25.67, 'pt'],
    ['Sant Sebastià', 43.32, -1.98, 'es'],
    ['Puigcerdà', 42.43, 1.93, 'es'],
    ['Perpinyà', 42.69, 2.89, 'fr'],
    ['Tolosa', 43.6, 1.44, 'fr'],
    ['Baiona', 43.49, -1.47, 'fr'],
    ['París', 48.86, 2.35, 'fr'],
    ['Lilla', 50.63, 3.06, 'fr'],
    ['Estrasburg', 48.58, 7.75, 'fr'],
    ['Niça', 43.7, 7.27, 'fr'],
    ['Brest', 48.39, -4.49, 'fr'],
    ['Ajaccio', 41.92, 8.74, 'fr'],
    ['Lió', 45.76, 4.84, 'fr'],
    ['Brussel·les', 50.85, 4.35, undefined],
    ['Ginebra', 46.2, 6.14, undefined],
    ['Torí', 45.07, 7.68, undefined],
    ['Basilea', 47.56, 7.59, undefined],
  ])('%s', (_name, lat, lng, expected) => {
    expect(detectCountry({ lat, lng })).toBe(expected)
  })
})
