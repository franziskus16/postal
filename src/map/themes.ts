/**
 * Temes riso de POSTAL per país. Cada país pren com a tinta principal
 * el color de les seves bústies:
 *  - Espanya: groc Correos + vermell (els colors de la bandera)
 *  - Portugal: vermell CTT + verd (també els de la bandera)
 *  - França: groc La Poste + blau La Poste, amb el vermell de la bandera
 *  - Itàlia: vermell de les «cassette» + verd de la bandera, sobre paper més càlid
 * La tinta blava de les línies és comuna a tots dos.
 */
export interface Theme {
  paper: string
  ink: string // línies i text
  inkSoft: string
  primary: string // color de les bústies: segells, botons, segona passada riso
  onPrimary: string // text sobre el color principal
  primaryTint: string // parcs (principal molt clar)
  primaryTint2: string // boscos
  accent: string // ruta, bústia seleccionada, autopistes, rètols de barri
  onAccent: string
  stripe: string // franges del sobre de correu aeri
  water: string
  building: string
  buildingLine: string
}

const shared = {
  paper: '#F7F2E6',
  ink: '#2C4BA0', // riso blue
  inkSoft: '#6C7DB8',
  water: '#C3CEEA',
  building: '#E5E2E6',
  buildingLine: '#C9CDE0',
}

export const THEMES = {
  es: {
    ...shared,
    primary: '#FFD93B', // riso yellow
    onPrimary: shared.ink,
    primaryTint: '#FBEAA0',
    primaryTint2: '#F5DE7E',
    accent: '#F15060', // riso bright red
    onAccent: shared.paper,
    stripe: '#F15060',
  },
  pt: {
    ...shared,
    paper: '#F8F1EC',
    primary: '#E5402E', // vermell CTT
    onPrimary: '#F8F1EC',
    primaryTint: '#F6CFC6',
    primaryTint2: '#EFB7AB',
    accent: '#00A95C', // riso green
    onAccent: '#F8F1EC',
    stripe: '#E5402E',
    building: '#EAE1E2',
  },
  fr: {
    ...shared,
    paper: '#F6F3EC',
    ink: '#1B2F86', // blau La Poste, més fosc que el riso blue
    inkSoft: '#5D6BA8',
    primary: '#FFC20E', // groc La Poste, més càlid que el de Correos
    onPrimary: '#1B2F86',
    primaryTint: '#FDE9A6',
    primaryTint2: '#F7DA80',
    accent: '#E8343A', // vermell de la bandera
    onAccent: '#F6F3EC',
    stripe: '#E8343A',
    water: '#BFCBEA',
  },
  it: {
    ...shared,
    paper: '#F8F2E8',
    primary: '#D9322B', // vermell de les bústies italianes, més fosc que el de CTT
    onPrimary: '#F8F2E8',
    primaryTint: '#F3CFC2',
    primaryTint2: '#EAB6A6',
    accent: '#009246', // verd de la bandera
    onAccent: '#F8F2E8',
    stripe: '#D9322B',
    building: '#ECE2DD',
  },
} satisfies Record<string, Theme>

export type ThemeCode = keyof typeof THEMES

/** Bústies blaves (p. ex. el Correio Azul portuguès): mateix to a tots els temes. */
export const BLUE_BOX = '#2F6FD6'

/** Aplica el tema a la interfície (variables CSS). */
export function applyThemeCss(t: Theme) {
  const s = document.documentElement.style
  s.setProperty('--paper', t.paper)
  s.setProperty('--ink', t.ink)
  s.setProperty('--ink-soft', t.inkSoft)
  s.setProperty('--primary', t.primary)
  s.setProperty('--on-primary', t.onPrimary)
  s.setProperty('--accent', t.accent)
  s.setProperty('--on-accent', t.onAccent)
  s.setProperty('--stripe', t.stripe)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.paper)
}
