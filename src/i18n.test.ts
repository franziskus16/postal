import { describe, it, expect, afterEach } from 'vitest'
import { detectLang, lang, t, countryName } from './i18n'
import { describe as describeManeuver } from './lib/routing'

afterEach(() => void (lang.value = 'ca'))

describe('idioma', () => {
  it.each([
    [['ca-ES', 'es'], 'ca'],
    [['es-ES'], 'es'],
    [['pt-PT'], 'pt'],
    [['pt-BR'], 'pt'],
    [['fr-FR'], 'fr'],
    [['it-IT'], 'it'],
    [['de-DE', 'fr'], 'fr'],
    [['gl-ES'], 'es'],
    [['ja-JP'], 'en'],
    [[], 'en'],
  ])('%j → %s', (prefs, expected) => {
    expect(detectLang('', prefs)).toBe(expected)
  })

  it('?lang= mana per sobre del navegador', () => {
    expect(detectLang('?lang=pt', ['es-ES'])).toBe('pt')
  })

  it('tots els idiomes tradueixen els textos i les instruccions', () => {
    for (const l of ['ca', 'es', 'pt', 'fr', 'it', 'en'] as const) {
      lang.value = l
      expect(t('count', { n: 5 })).toContain('5')
      expect(countryName('it')).toMatch(/^It/)
      const text = describeManeuver({ type: 'turn', modifier: 'left' }, 'Rua Augusta')
      expect(text).toContain('Rua Augusta')
      expect(text).not.toContain('{')
    }
    lang.value = 'es'
    expect(describeManeuver({ type: 'turn', modifier: 'right' }, 'Gran Vía')).toBe('Gira a la derecha por Gran Vía')
    lang.value = 'fr'
    expect(t('sentTo', { name: 'Mamie' })).toBe('Mamie la recevra bientôt.')
  })
})
