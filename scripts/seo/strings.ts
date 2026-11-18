/**
 * Textos de les pàgines estàtiques (SEO). Van a part de src/i18n.ts
 * perquè no engreixin l'aplicació.
 */
import type { CC, Lang } from './cities'

type Kind = 'tobacco' | 'post_office' | 'post_partner' | 'vending'
export interface Stats {
  boxes: number
  withTimes: number
  saturday: number
  latest?: string // hora més tardana entre setmana, «19:30»
  stamps: number
  kinds: Partial<Record<Kind, number>>
}

export interface Strings {
  slug: string // part de l'URL de les pàgines de ciutat
  locale: string // og:locale
  homeTitle: string
  homeDesc: string
  homeH1: string
  homeIntro: string
  homeHow: string[]
  openMap: string
  openMapCity: (c: string) => string
  citiesOf: (country: string) => string
  countries: Record<CC, string>
  cityTitle: (c: string) => string
  cityDesc: (c: string, s: Stats) => string
  cityH1: (c: string) => string
  cityIntro: (c: string, s: Stats, r: number) => string
  statBoxes: string
  statTimes: string
  statSaturday: string
  statLatest: string
  statStamps: string
  officesH: (c: string) => string
  stampsH: (c: string) => string
  stampsText: (c: string, s: Stats, cc: CC) => string
  kind: Record<Kind, string>
  faqH: string
  faq: (c: string, s: Stats, cc: CC) => [string, string][]
  nearby: string
  home: string
  updated: (d: string) => string
  credits: string
  privacy: string
  otherLangs: string
}

const n = (x: number, lang: Lang) => x.toLocaleString(lang)
const list = (items: string[], and: string) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`
const kindList = (s: Stats, lang: Lang, labels: Record<Kind, string>, and: string) =>
  list(
    (Object.keys(labels) as Kind[]).filter((k) => s.kinds[k]).map((k) => `${n(s.kinds[k]!, lang)} ${labels[k]}`),
    and,
  )

// On es venen els segells a cada país, en cada idioma
const WHERE: Record<Lang, Record<CC, string>> = {
  ca: {
    es: 'als estancs i a les oficines de Correos',
    pt: 'a les botigues CTT i als punts de correus',
    fr: 'als estancs (bureaux de tabac) i a les oficines de La Poste',
    it: 'als estancs (tabaccherie) i a les oficines de Poste Italiane',
  },
  es: {
    es: 'en los estancos y en las oficinas de Correos',
    pt: 'en las tiendas CTT y en los puntos de correos',
    fr: 'en los estancos (bureaux de tabac) y en las oficinas de La Poste',
    it: 'en los estancos (tabaccherie) y en las oficinas de Poste Italiane',
  },
  pt: {
    es: 'nos estancos e nas estações dos Correos',
    pt: 'nas lojas CTT e nos postos de correio',
    fr: 'nas tabacarias (bureaux de tabac) e nas estações da La Poste',
    it: 'nas tabacarias (tabaccherie) e nas estações da Poste Italiane',
  },
  fr: {
    es: 'dans les bureaux de tabac (estancos) et les bureaux de Correos',
    pt: 'dans les boutiques CTT et les points de poste',
    fr: 'dans les bureaux de tabac, les bureaux de poste et les relais La Poste',
    it: 'dans les bureaux de tabac (tabaccherie) et les bureaux de Poste Italiane',
  },
  it: {
    es: 'nelle tabaccherie (estancos) e negli uffici di Correos',
    pt: 'nei negozi CTT e nei punti posta',
    fr: 'nelle tabaccherie (bureaux de tabac) e negli uffici di La Poste',
    it: 'nelle tabaccherie e negli uffici di Poste Italiane',
  },
  en: {
    es: 'at tobacconists (estancos) and Correos post offices',
    pt: 'at CTT shops and postal agents',
    fr: 'at tobacconists (bureaux de tabac), La Poste offices and relay points',
    it: 'at tobacconists (tabaccherie) and Poste Italiane offices',
  },
}

export const STRINGS: Record<Lang, Strings> = {
  ca: {
    slug: 'busties',
    locale: 'ca_ES',
    homeTitle: 'POSTAL — Troba la bústia de correus més propera',
    homeDesc:
      'Mapa gratuït de bústies de correus a Espanya, Portugal, França i Itàlia. Troba la bústia més propera, mira a quina hora es recull i on comprar segells.',
    homeH1: 'Troba la bústia de correus més propera',
    homeIntro:
      'POSTAL és un mapa de les bústies de correus i dels llocs on comprar segells. Et localitza, et diu quina bústia tens més a prop i a quina hora es recull, i t’hi porta a peu o en bici.',
    homeHow: [
      'Obre el mapa i deixa que et localitzi.',
      'Tria una bústia: veuràs la distància i les hores de recollida.',
      'Segueix la fletxa pels carrers, a peu o en bici, amb la carta a la mà.',
    ],
    openMap: 'Obre el mapa',
    openMapCity: (c) => `Veure les bústies de ${c} al mapa`,
    citiesOf: (country) => `Bústies per ciutat · ${country}`,
    countries: { es: 'Espanya', pt: 'Portugal', fr: 'França', it: 'Itàlia' },
    cityTitle: (c) => `Bústies de correus a ${c}: mapa i hores de recollida · POSTAL`,
    cityDesc: (c, s) =>
      `${n(s.boxes, 'ca')} bústies de correus a ${c} al mapa. Troba la més propera, mira a quina hora es recull i on comprar segells.`,
    cityH1: (c) => `Bústies de correus a ${c}`,
    cityIntro: (c, s, r) =>
      `Hi ha ${n(s.boxes, 'ca')} bústies de correus en un radi de ${r} km del centre de ${c}, segons OpenStreetMap. Obre el mapa per trobar la més propera i veure’n les hores de recollida.`,
    statBoxes: 'bústies',
    statTimes: 'amb horari de recollida',
    statSaturday: 'recullen en dissabte',
    statLatest: 'recollida més tardana (dl.–dv.)',
    statStamps: 'llocs on comprar segells',
    officesH: (c) => `Oficines de correus a ${c}`,
    stampsH: (c) => `On comprar segells a ${c}`,
    stampsText: (c, s, cc) =>
      `Els segells es venen ${WHERE.ca[cc]}. Al mapa de ${c} hi ha ${kindList(s, 'ca', STRINGS.ca.kind, 'i')}. Toca «Segells» al mapa per veure’ls amb l’horari.`,
    kind: { tobacco: 'estancs', post_office: 'oficines de correus', post_partner: 'punts de correus', vending: 'màquines de segells' },
    faqH: 'Preguntes freqüents',
    faq: (c, s, cc) => [
      [
        `On és la bústia més propera a ${c}?`,
        `Obre POSTAL i deixa que el mapa et localitzi: et mostra les bústies més properes ordenades per distància i et guia a peu o en bici fins a la que triïs. A ${c} n’hi ha ${n(s.boxes, 'ca')} al mapa.`,
      ],
      [
        `A quina hora es recull el correu de les bústies de ${c}?`,
        s.latest
          ? `Depèn de cada bústia. De les ${n(s.withTimes, 'ca')} que tenen l’horari registrat, la recollida més tardana entre setmana és a les ${s.latest}${s.saturday ? ` i ${n(s.saturday, 'ca')} també es recullen en dissabte` : ''}. Al mapa veuràs l’horari de cadascuna.`
          : `Cada bústia té el seu horari, que normalment hi ve indicat. Al mapa el veuràs quan estigui registrat.`,
      ],
      [`On puc comprar segells a ${c}?`, `Els segells es venen ${WHERE.ca[cc]}. A la secció «Segells» de POSTAL hi trobaràs els més propers amb l’horari d’obertura.`],
    ],
    nearby: 'Ciutats properes',
    home: 'Inici',
    updated: (d) => `Dades actualitzades el ${d}.`,
    credits: 'Dades © col·laboradors d’OpenStreetMap (ODbL). Un projecte de G2, fet per Francesc Gimenez.',
    privacy: 'Privacitat',
    otherLangs: 'Altres idiomes',
  },
  es: {
    slug: 'buzones',
    locale: 'es_ES',
    homeTitle: 'POSTAL — Encuentra el buzón de correos más cercano',
    homeDesc:
      'Mapa gratuito de buzones de correos en España, Portugal, Francia e Italia. Encuentra el buzón más cercano, consulta la hora de recogida y dónde comprar sellos.',
    homeH1: 'Encuentra el buzón de correos más cercano',
    homeIntro:
      'POSTAL es un mapa de los buzones de correos y de los sitios donde comprar sellos. Te localiza, te dice qué buzón tienes más cerca y a qué hora se recoge, y te lleva a pie o en bici.',
    homeHow: [
      'Abre el mapa y deja que te localice.',
      'Elige un buzón: verás la distancia y las horas de recogida.',
      'Sigue la flecha por las calles, a pie o en bici, con la carta en la mano.',
    ],
    openMap: 'Abrir el mapa',
    openMapCity: (c) => `Ver los buzones de ${c} en el mapa`,
    citiesOf: (country) => `Buzones por ciudad · ${country}`,
    countries: { es: 'España', pt: 'Portugal', fr: 'Francia', it: 'Italia' },
    cityTitle: (c) => `Buzones de correos en ${c}: mapa y horarios de recogida · POSTAL`,
    cityDesc: (c, s) =>
      `${n(s.boxes, 'es')} buzones de correos en ${c} en el mapa. Encuentra el más cercano, consulta a qué hora se recoge y dónde comprar sellos.`,
    cityH1: (c) => `Buzones de correos en ${c}`,
    cityIntro: (c, s, r) =>
      `Hay ${n(s.boxes, 'es')} buzones de correos en un radio de ${r} km del centro de ${c}, según OpenStreetMap. Abre el mapa para encontrar el más cercano y ver sus horas de recogida.`,
    statBoxes: 'buzones',
    statTimes: 'con horario de recogida',
    statSaturday: 'recogen en sábado',
    statLatest: 'recogida más tardía (lu.–vi.)',
    statStamps: 'sitios donde comprar sellos',
    officesH: (c) => `Oficinas de correos en ${c}`,
    stampsH: (c) => `Dónde comprar sellos en ${c}`,
    stampsText: (c, s, cc) =>
      `Los sellos se venden ${WHERE.es[cc]}. En el mapa de ${c} hay ${kindList(s, 'es', STRINGS.es.kind, 'y')}. Toca «Sellos» en el mapa para verlos con su horario.`,
    kind: { tobacco: 'estancos', post_office: 'oficinas de correos', post_partner: 'puntos de correos', vending: 'máquinas de sellos' },
    faqH: 'Preguntas frecuentes',
    faq: (c, s, cc) => [
      [
        `¿Dónde está el buzón más cercano en ${c}?`,
        `Abre POSTAL y deja que el mapa te localice: te muestra los buzones más cercanos ordenados por distancia y te guía a pie o en bici hasta el que elijas. En ${c} hay ${n(s.boxes, 'es')} en el mapa.`,
      ],
      [
        `¿A qué hora se recoge el correo de los buzones de ${c}?`,
        s.latest
          ? `Depende de cada buzón. De los ${n(s.withTimes, 'es')} que tienen el horario registrado, la recogida más tardía entre semana es a las ${s.latest}${s.saturday ? ` y ${n(s.saturday, 'es')} también se recogen en sábado` : ''}. En el mapa verás el horario de cada uno.`
          : `Cada buzón tiene su horario, que normalmente viene indicado en el propio buzón. En el mapa lo verás cuando esté registrado.`,
      ],
      [`¿Dónde puedo comprar sellos en ${c}?`, `Los sellos se venden ${WHERE.es[cc]}. En la sección «Sellos» de POSTAL encontrarás los más cercanos con su horario de apertura.`],
    ],
    nearby: 'Ciudades cercanas',
    home: 'Inicio',
    updated: (d) => `Datos actualizados el ${d}.`,
    credits: 'Datos © colaboradores de OpenStreetMap (ODbL). Un proyecto de G2, hecho por Francesc Gimenez.',
    privacy: 'Privacidad',
    otherLangs: 'Otros idiomas',
  },
  pt: {
    slug: 'marcos-do-correio',
    locale: 'pt_PT',
    homeTitle: 'POSTAL — Encontre o marco do correio mais próximo',
    homeDesc:
      'Mapa gratuito de marcos do correio em Portugal, Espanha, França e Itália. Encontre o marco mais próximo, veja a hora da recolha e onde comprar selos.',
    homeH1: 'Encontre o marco do correio mais próximo',
    homeIntro:
      'O POSTAL é um mapa dos marcos do correio e dos sítios onde comprar selos. Localiza-o, diz-lhe qual o marco mais perto e a que horas é feita a recolha, e leva-o lá a pé ou de bicicleta.',
    homeHow: [
      'Abra o mapa e deixe que o localize.',
      'Escolha um marco: verá a distância e as horas de recolha.',
      'Siga a seta pelas ruas, a pé ou de bicicleta, com a carta na mão.',
    ],
    openMap: 'Abrir o mapa',
    openMapCity: (c) => `Ver os marcos do correio de ${c} no mapa`,
    citiesOf: (country) => `Marcos do correio por cidade · ${country}`,
    countries: { es: 'Espanha', pt: 'Portugal', fr: 'França', it: 'Itália' },
    cityTitle: (c) => `Marcos do correio em ${c}: mapa e horas de recolha · POSTAL`,
    cityDesc: (c, s) =>
      `${n(s.boxes, 'pt')} marcos do correio em ${c} no mapa. Encontre o mais próximo, veja a que horas é feita a recolha e onde comprar selos.`,
    cityH1: (c) => `Marcos do correio em ${c}`,
    cityIntro: (c, s, r) =>
      `Há ${n(s.boxes, 'pt')} marcos do correio num raio de ${r} km do centro de ${c}, segundo o OpenStreetMap. Abra o mapa para encontrar o mais próximo e ver as horas de recolha.`,
    statBoxes: 'marcos do correio',
    statTimes: 'com horário de recolha',
    statSaturday: 'com recolha ao sábado',
    statLatest: 'recolha mais tardia (seg.–sex.)',
    statStamps: 'sítios onde comprar selos',
    officesH: (c) => `Estações de correio em ${c}`,
    stampsH: (c) => `Onde comprar selos em ${c}`,
    stampsText: (c, s, cc) =>
      `Os selos vendem-se ${WHERE.pt[cc]}. No mapa de ${c} há ${kindList(s, 'pt', STRINGS.pt.kind, 'e')}. Toque em «Selos» no mapa para os ver com o horário.`,
    kind: { tobacco: 'tabacarias', post_office: 'estações de correio', post_partner: 'postos de correio', vending: 'máquinas de selos' },
    faqH: 'Perguntas frequentes',
    faq: (c, s, cc) => [
      [
        `Onde fica o marco do correio mais próximo em ${c}?`,
        `Abra o POSTAL e deixe que o mapa o localize: mostra os marcos mais próximos ordenados por distância e guia-o a pé ou de bicicleta até ao que escolher. Em ${c} há ${n(s.boxes, 'pt')} no mapa.`,
      ],
      [
        `A que horas é feita a recolha dos marcos do correio em ${c}?`,
        s.latest
          ? `Depende de cada marco. Dos ${n(s.withTimes, 'pt')} com horário registado, a recolha mais tardia nos dias úteis é às ${s.latest}${s.saturday ? ` e ${n(s.saturday, 'pt')} também têm recolha ao sábado` : ''}. No mapa verá o horário de cada um.`
          : `Cada marco tem o seu horário, normalmente indicado no próprio marco. No mapa verá o horário quando estiver registado.`,
      ],
      [`Onde posso comprar selos em ${c}?`, `Os selos vendem-se ${WHERE.pt[cc]}. Na secção «Selos» do POSTAL encontra os mais próximos com o horário de abertura.`],
    ],
    nearby: 'Cidades próximas',
    home: 'Início',
    updated: (d) => `Dados atualizados a ${d}.`,
    credits: 'Dados © colaboradores do OpenStreetMap (ODbL). Um projeto da G2, feito por Francesc Gimenez.',
    privacy: 'Privacidade',
    otherLangs: 'Outros idiomas',
  },
  fr: {
    slug: 'boites-aux-lettres',
    locale: 'fr_FR',
    homeTitle: 'POSTAL — Trouvez la boîte aux lettres la plus proche',
    homeDesc:
      'Carte gratuite des boîtes aux lettres de La Poste en France, en Espagne, au Portugal et en Italie. Trouvez la boîte la plus proche, l’heure de levée et où acheter des timbres.',
    homeH1: 'Trouvez la boîte aux lettres la plus proche',
    homeIntro:
      'POSTAL est une carte des boîtes aux lettres et des points de vente de timbres. Il vous localise, vous indique la boîte la plus proche et l’heure de levée, et vous y guide à pied ou à vélo.',
    homeHow: [
      'Ouvrez la carte et laissez-la vous localiser.',
      'Choisissez une boîte : vous verrez la distance et les heures de levée.',
      'Suivez la flèche dans les rues, à pied ou à vélo, la lettre à la main.',
    ],
    openMap: 'Ouvrir la carte',
    openMapCity: (c) => `Voir les boîtes aux lettres de ${c} sur la carte`,
    citiesOf: (country) => `Boîtes aux lettres par ville · ${country}`,
    countries: { es: 'Espagne', pt: 'Portugal', fr: 'France', it: 'Italie' },
    cityTitle: (c) => `Boîtes aux lettres à ${c} : carte et heures de levée · POSTAL`,
    cityDesc: (c, s) =>
      `${n(s.boxes, 'fr')} boîtes aux lettres à ${c} sur la carte. Trouvez la plus proche, son heure de levée et où acheter des timbres.`,
    cityH1: (c) => `Boîtes aux lettres à ${c}`,
    cityIntro: (c, s, r) =>
      `Il y a ${n(s.boxes, 'fr')} boîtes aux lettres dans un rayon de ${r} km autour du centre de ${c}, d’après OpenStreetMap. Ouvrez la carte pour trouver la plus proche et voir ses heures de levée.`,
    statBoxes: 'boîtes aux lettres',
    statTimes: 'avec heure de levée',
    statSaturday: 'levées le samedi',
    statLatest: 'levée la plus tardive (lun.–ven.)',
    statStamps: 'points de vente de timbres',
    officesH: (c) => `Bureaux de poste à ${c}`,
    stampsH: (c) => `Où acheter des timbres à ${c}`,
    stampsText: (c, s, cc) =>
      `On trouve des timbres ${WHERE.fr[cc]}. Sur la carte de ${c}, il y a ${kindList(s, 'fr', STRINGS.fr.kind, 'et')}. Touchez « Timbres » sur la carte pour les voir avec leurs horaires.`,
    kind: { tobacco: 'bureaux de tabac', post_office: 'bureaux de poste', post_partner: 'relais poste', vending: 'distributeurs de timbres' },
    faqH: 'Questions fréquentes',
    faq: (c, s, cc) => [
      [
        `Où est la boîte aux lettres la plus proche à ${c} ?`,
        `Ouvrez POSTAL et laissez la carte vous localiser : elle affiche les boîtes les plus proches par distance et vous guide à pied ou à vélo jusqu’à celle que vous choisissez. À ${c}, il y en a ${n(s.boxes, 'fr')} sur la carte.`,
      ],
      [
        `À quelle heure est la levée des boîtes aux lettres à ${c} ?`,
        s.latest
          ? `Cela dépend de chaque boîte. Parmi les ${n(s.withTimes, 'fr')} dont l’horaire est connu, la levée la plus tardive en semaine a lieu à ${s.latest!.replace(':', 'h')}${s.saturday ? ` et ${n(s.saturday, 'fr')} sont aussi levées le samedi` : ''}. La carte indique l’horaire de chacune.`
          : `Chaque boîte a son horaire, généralement affiché sur la boîte. La carte l’indique lorsqu’il est connu.`,
      ],
      [`Où acheter des timbres à ${c} ?`, `On trouve des timbres ${WHERE.fr[cc]}. Dans la section « Timbres » de POSTAL, vous verrez les plus proches avec leurs horaires d’ouverture.`],
    ],
    nearby: 'Villes proches',
    home: 'Accueil',
    updated: (d) => `Données mises à jour le ${d}.`,
    credits: 'Données © contributeurs d’OpenStreetMap (ODbL). Un projet de G2, réalisé par Francesc Gimenez.',
    privacy: 'Confidentialité',
    otherLangs: 'Autres langues',
  },
  it: {
    slug: 'cassette-postali',
    locale: 'it_IT',
    homeTitle: 'POSTAL — Trova la cassetta postale più vicina',
    homeDesc:
      'Mappa gratuita delle cassette postali in Italia, Spagna, Portogallo e Francia. Trova la cassetta più vicina, l’orario di levata e dove comprare i francobolli.',
    homeH1: 'Trova la cassetta postale più vicina',
    homeIntro:
      'POSTAL è una mappa delle cassette postali e dei punti vendita di francobolli. Ti localizza, ti dice qual è la cassetta più vicina e a che ora c’è la levata, e ti ci porta a piedi o in bici.',
    homeHow: [
      'Apri la mappa e lascia che ti localizzi.',
      'Scegli una cassetta: vedrai la distanza e gli orari di levata.',
      'Segui la freccia per le strade, a piedi o in bici, con la lettera in mano.',
    ],
    openMap: 'Apri la mappa',
    openMapCity: (c) => `Vedi le cassette postali di ${c} sulla mappa`,
    citiesOf: (country) => `Cassette postali per città · ${country}`,
    countries: { es: 'Spagna', pt: 'Portogallo', fr: 'Francia', it: 'Italia' },
    cityTitle: (c) => `Cassette postali a ${c}: mappa e orari di levata · POSTAL`,
    cityDesc: (c, s) =>
      `${n(s.boxes, 'it')} cassette postali a ${c} sulla mappa. Trova la più vicina, l’orario di levata e dove comprare i francobolli.`,
    cityH1: (c) => `Cassette postali a ${c}`,
    cityIntro: (c, s, r) =>
      `Ci sono ${n(s.boxes, 'it')} cassette postali in un raggio di ${r} km dal centro di ${c}, secondo OpenStreetMap. Apri la mappa per trovare la più vicina e vederne gli orari di levata.`,
    statBoxes: 'cassette postali',
    statTimes: 'con orario di levata',
    statSaturday: 'con levata il sabato',
    statLatest: 'levata più tardiva (lun.–ven.)',
    statStamps: 'punti vendita di francobolli',
    officesH: (c) => `Uffici postali a ${c}`,
    stampsH: (c) => `Dove comprare francobolli a ${c}`,
    stampsText: (c, s, cc) =>
      `I francobolli si comprano ${WHERE.it[cc]}. Sulla mappa di ${c} ci sono ${kindList(s, 'it', STRINGS.it.kind, 'e')}. Tocca «Francobolli» sulla mappa per vederli con gli orari.`,
    kind: { tobacco: 'tabaccherie', post_office: 'uffici postali', post_partner: 'punti posta', vending: 'distributori di francobolli' },
    faqH: 'Domande frequenti',
    faq: (c, s, cc) => [
      [
        `Dov’è la cassetta postale più vicina a ${c}?`,
        `Apri POSTAL e lascia che la mappa ti localizzi: ti mostra le cassette più vicine in ordine di distanza e ti guida a piedi o in bici fino a quella che scegli. A ${c} ce ne sono ${n(s.boxes, 'it')} sulla mappa.`,
      ],
      [
        `A che ora c’è la levata delle cassette postali a ${c}?`,
        s.latest
          ? `Dipende da ogni cassetta. Delle ${n(s.withTimes, 'it')} con l’orario registrato, la levata più tardiva nei giorni feriali è alle ${s.latest}${s.saturday ? ` e ${n(s.saturday, 'it')} hanno la levata anche il sabato` : ''}. Sulla mappa vedrai l’orario di ciascuna.`
          : `Ogni cassetta ha il suo orario, di solito indicato sulla cassetta stessa. Sulla mappa lo vedrai quando è registrato.`,
      ],
      [`Dove posso comprare francobolli a ${c}?`, `I francobolli si comprano ${WHERE.it[cc]}. Nella sezione «Francobolli» di POSTAL trovi i più vicini con gli orari di apertura.`],
    ],
    nearby: 'Città vicine',
    home: 'Home',
    updated: (d) => `Dati aggiornati il ${d}.`,
    credits: 'Dati © contributori di OpenStreetMap (ODbL). Un progetto di G2, realizzato da Francesc Gimenez.',
    privacy: 'Privacy',
    otherLangs: 'Altre lingue',
  },
  en: {
    slug: 'postboxes',
    locale: 'en_GB',
    homeTitle: 'POSTAL — Find the nearest postbox',
    homeDesc:
      'Free map of postboxes (mailboxes) in Spain, Portugal, France and Italy. Find the nearest postbox, check its collection times and where to buy stamps.',
    homeH1: 'Find the nearest postbox',
    homeIntro:
      'POSTAL is a map of postboxes and of the places that sell stamps. It finds you, tells you which postbox is closest and when it is collected, and guides you there on foot or by bike.',
    homeHow: [
      'Open the map and let it find you.',
      'Pick a postbox: you’ll see the distance and the collection times.',
      'Follow the arrow through the streets, on foot or by bike, letter in hand.',
    ],
    openMap: 'Open the map',
    openMapCity: (c) => `See the postboxes in ${c} on the map`,
    citiesOf: (country) => `Postboxes by city · ${country}`,
    countries: { es: 'Spain', pt: 'Portugal', fr: 'France', it: 'Italy' },
    cityTitle: (c) => `Postboxes in ${c}: map and collection times · POSTAL`,
    cityDesc: (c, s) =>
      `${n(s.boxes, 'en')} postboxes in ${c} on the map. Find the nearest one, check its collection times and where to buy stamps.`,
    cityH1: (c) => `Postboxes in ${c}`,
    cityIntro: (c, s, r) =>
      `There are ${n(s.boxes, 'en')} postboxes within ${r} km of the centre of ${c}, according to OpenStreetMap. Open the map to find the nearest one and see its collection times.`,
    statBoxes: 'postboxes',
    statTimes: 'with collection times',
    statSaturday: 'collected on Saturday',
    statLatest: 'latest collection (Mon–Fri)',
    statStamps: 'places to buy stamps',
    officesH: (c) => `Post offices in ${c}`,
    stampsH: (c) => `Where to buy stamps in ${c}`,
    stampsText: (c, s, cc) =>
      `Stamps are sold ${WHERE.en[cc]}. The map of ${c} has ${kindList(s, 'en', STRINGS.en.kind, 'and')}. Tap “Stamps” on the map to see them with their opening hours.`,
    kind: { tobacco: 'tobacconists', post_office: 'post offices', post_partner: 'postal agents', vending: 'stamp machines' },
    faqH: 'Frequently asked questions',
    faq: (c, s, cc) => [
      [
        `Where is the nearest postbox in ${c}?`,
        `Open POSTAL and let the map find you: it lists the nearest postboxes by distance and guides you on foot or by bike to the one you choose. There are ${n(s.boxes, 'en')} in ${c} on the map.`,
      ],
      [
        `What time are postboxes collected in ${c}?`,
        s.latest
          ? `It depends on each postbox. Of the ${n(s.withTimes, 'en')} with known times, the latest weekday collection is at ${s.latest}${s.saturday ? `, and ${n(s.saturday, 'en')} are also collected on Saturday` : ''}. The map shows the times for each one.`
          : `Each postbox has its own times, usually shown on the box itself. The map shows them when they are recorded.`,
      ],
      [`Where can I buy stamps in ${c}?`, `Stamps are sold ${WHERE.en[cc]}. The “Stamps” section of POSTAL shows the nearest ones with their opening hours.`],
    ],
    nearby: 'Nearby cities',
    home: 'Home',
    updated: (d) => `Data updated on ${d}.`,
    credits: 'Data © OpenStreetMap contributors (ODbL). A G2 project, made by Francesc Gimenez.',
    privacy: 'Privacy',
    otherLangs: 'Other languages',
  },
}

export const LANG_NAMES: Record<Lang, string> = {
  ca: 'Català',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  it: 'Italiano',
  en: 'English',
}
