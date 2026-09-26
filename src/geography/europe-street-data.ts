import type { City } from './cities.js'
import { europeReviewedNames, isEuropeReviewedCountry } from './europe-reviewed-names.js'
import { europeGenderedNames, isEuropeGenderedCountry } from './europe-gendered-names.js'
import { europeIslandNames, isEuropeIslandCountry } from './europe-island-names.js'
import { drawStreet } from './street-random.js'

type Style = 'catalan' | 'albanian' | 'german' | 'swissGerman' | 'southSlavic'
  | 'french' | 'dutch' | 'bulgarian' | 'belarusian' | 'greek' | 'czech'
  | 'danish' | 'estonian' | 'spanish' | 'finnish' | 'faroese' | 'english'
  | 'hungarian' | 'icelandic' | 'italian' | 'lithuanian' | 'latvian'
  | 'romanian' | 'maltese' | 'norwegian' | 'polish' | 'portuguese'
  | 'russian' | 'swedish' | 'slovak' | 'ukrainian'

// Country-level street forms; BE, CH and ES are refined by sampled region.
const europeanStreetStyles: Record<string, Style> = {
  AD: 'catalan', AL: 'albanian', AT: 'german', AX: 'swedish', BA: 'southSlavic',
  BE: 'french', BG: 'bulgarian', BY: 'belarusian', CH: 'swissGerman', CY: 'greek',
  CZ: 'czech', DE: 'german', DK: 'danish', EE: 'estonian', ES: 'spanish',
  FI: 'finnish', FO: 'faroese', FR: 'french', GB: 'english', GG: 'english',
  GI: 'english', GR: 'greek', HR: 'southSlavic', HU: 'hungarian', IE: 'english',
  IM: 'english', IS: 'icelandic', IT: 'italian', JE: 'english', LI: 'german',
  LT: 'lithuanian', LU: 'french', LV: 'latvian', MC: 'french', MD: 'romanian',
  ME: 'southSlavic', MK: 'southSlavic', MT: 'maltese', NL: 'dutch', NO: 'norwegian',
  PL: 'polish', PT: 'portuguese', RO: 'romanian', RS: 'southSlavic', RU: 'russian',
  SE: 'swedish', SI: 'southSlavic', SK: 'slovak', SM: 'italian', UA: 'ukrainian',
}

export function hasSyntheticEuropeanStreet(country: string): boolean {
  return Object.hasOwn(europeanStreetStyles, country)
}

function styleForCity(city: City): Style | undefined {
  if (city.country === 'BE') return city.region === 'Flanders' ? 'dutch' : 'french'
  if (city.country === 'CH') {
    if (city.region === 'Ticino') return 'italian'
    if (city.region === 'Geneva' || city.region === 'Vaud') return 'french'
  }
  if (city.country === 'ES' && city.region === 'Catalonia') return 'catalan'
  return europeanStreetStyles[city.country]
}

function nameParts(country: string, key: string): { family: string; given: string } | null {
  if (isEuropeReviewedCountry(country)) {
    const pool = europeReviewedNames[country]
    const families = country === 'FI' ? pool.family.filter((family) => /nen$/i.test(family)) : pool.family
    return {
      family: families[drawStreet(key, `street-name:${country}`, families.length)],
      given: pool.male[drawStreet(key, `street-given:${country}`, pool.male.length)],
    }
  }
  if (isEuropeIslandCountry(country)) {
    const pool = europeIslandNames[country]
    return {
      family: pool.family[drawStreet(key, `street-name:${country}`, pool.family.length)],
      given: pool.male[drawStreet(key, `street-given:${country}`, pool.male.length)],
    }
  }
  if (isEuropeGenderedCountry(country)) {
    const pool = europeGenderedNames[country]
    const feminine = country !== 'LV' && country !== 'LT' && drawStreet(key, `street-gender:${country}`, 2) === 0
    const family = country === 'LV' ? pool.familyMale.filter((name) => /[šs]$/u.test(name) && !/is$/u.test(name))
      : feminine ? pool.familyFemale : pool.familyMale
    const given = feminine ? pool.female : pool.male
    return {
      family: family[drawStreet(key, `street-name:${country}`, family.length)],
      given: given[drawStreet(key, `street-given:${country}`, given.length)],
    }
  }
  return null
}

function compound(name: string): string {
  return name.replace(/\s+/g, '-')
}

function estonianGenitive(name: string): string {
  if (/er$/i.test(name)) return `${name}i`
  if (/mm$/i.test(name)) return `${name}e`
  if (/aar$/i.test(name)) return `${name}e`
  if (/as$/i.test(name)) return `${name}e`
  return name
}

function lithuanianGenitive(name: string): string {
  if (/aitis$/i.test(name)) return name.replace(/tis$/i, 'čio')
  if (/čius$/i.test(name)) return name.replace(/čius$/i, 'čiaus')
  if (/ius$/i.test(name)) return name.replace(/ius$/i, 'iaus')
  if (/us$/i.test(name)) return name.replace(/us$/i, 'aus')
  if (/ys$/i.test(name)) return name.replace(/ys$/i, 'io')
  if (/is$/i.test(name)) return name.replace(/is$/i, 'io')
  if (/as$/i.test(name)) return name.replace(/as$/i, 'o')
  return name
}

function render(style: Style, family: string, person: string, variant: number, number: number): string {
  switch (style) {
    case 'french': return `${number} ${['Rue', 'Avenue', 'Boulevard'][variant]} ${person}`
    case 'english': return `${number} ${person} ${['Road', 'Street', 'Avenue'][variant]}`
    case 'catalan': return `${['Carrer', 'Avinguda', 'Plaça'][variant]} ${person}, ${number}`
    case 'albanian': return `Rruga ${person}, ${number}`
    case 'spanish': return `${['Calle', 'Avenida', 'Plaza'][variant]} ${person}, ${number}`
    case 'italian': return `${['Via', 'Viale', 'Piazza'][variant]} ${person}, ${number}`
    case 'portuguese': return `${['Rua', 'Avenida', 'Travessa'][variant]} ${person}, ${number}`
    case 'maltese': return `Triq ${person}, ${number}`
    case 'greek': return `${variant === 0 ? 'Leoforos' : 'Odos'} ${family} ${number}`
    case 'romanian': return `${['Strada', 'Bulevardul', 'Aleea'][variant]} ${person} nr. ${number}`
    case 'german': return `${compound(family.replace(/^von(?: und zu)?\s+/i, ''))}${['straße', 'weg', 'allee'][variant]} ${number}`
    case 'swissGerman': return `${compound(family)}${['strasse', 'weg', 'allee'][variant]} ${number}`
    case 'dutch': return `${family[0].toLocaleUpperCase('nl')}${family.slice(1)}${['straat', 'laan', 'weg'][variant]} ${number}`
    case 'danish': return `${compound(family)}s${['gade', 'vej', 'allé'][variant]} ${number}`
    case 'faroese': return `${compound(family)}${['gøta', 'vegur', 'brekka'][variant]} ${number}`
    case 'norwegian': return `${compound(family)}${['veien', 'gata', 'alléen'][variant]} ${number}`
    case 'swedish': return `${compound(family)}s${['gatan', 'vägen', 'allén'][variant]} ${number}`
    case 'finnish': {
      const stem = family.replace(/nen$/i, 'sen')
      return `${compound(stem)}${['katu', 'tie', 'kuja'][variant]} ${number}`
    }
    case 'estonian': return `${person.slice(0, -family.length)}${estonianGenitive(family)} ${['tänav', 'tee', 'puiestee'][variant]} ${number}`
    case 'hungarian': return `${person} ${['utca', 'út', 'tér'][variant]} ${number}`
    case 'latvian': return `${family.slice(0, -1)}a ${['iela', 'gatve', 'bulvāris'][variant]} ${number}`
    case 'lithuanian': return `${lithuanianGenitive(family)} ${['gatvė', 'alėja', 'prospektas'][variant]} ${number}`
    case 'southSlavic': return `${['Ulica', 'Bulevar', 'Trg'][variant]} ${person} ${number}`
    case 'bulgarian': return `ul. ${family} ${number}`
    case 'belarusian': return `vul. ${family} ${number}`
    case 'czech': return `ul. ${family} ${number}`
    case 'polish': return `ul. ${family} ${number}`
    case 'russian': return `ulitsa ${family} ${number}`
    case 'slovak': return `Ulica ${family} ${number}`
    case 'ukrainian': return `vulytsia ${family} ${number}`
    case 'icelandic': {
      const roots = ['Hafnar', 'Skóla', 'Brekk', 'Fells', 'Hlíðar', 'Lækjar', 'Kirkju', 'Hóls']
      const root = roots[drawStreet(person, 'icelandic-root', roots.length)]
      return `${root}${['gata', 'vegur', 'stræti'][variant]} ${number}`
    }
  }
}

export function europeanStreetLineForCity(city: City, key: string): string | null {
  const style = styleForCity(city)
  if (!style) return null
  const parts = nameParts(city.country, key)
  if (!parts) return null
  const { family, given } = parts
  const person = drawStreet(key, `street-person:${city.country}`, 3) === 0 || given === family
    ? family : `${given} ${family}`
  const variant = drawStreet(key, `street-form:${city.country}`, 3)
  const number = drawStreet(key, `building:${city.country}`, 240) + 1
  return render(style, family, person, variant, number)
}
