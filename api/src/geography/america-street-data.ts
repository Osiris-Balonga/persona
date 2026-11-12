import type { City } from './cities.js'
import { northAmericaReviewedNames, isNorthAmericaReviewedCountry } from './north-america-reviewed-names.js'
import { northAmericaTerritoryNames, isNorthAmericaTerritoryCountry } from './north-america-territory-names.js'
import { southAmericaReviewedNames, isSouthAmericaReviewedCountry } from './south-america-reviewed-names.js'
import { southAmericaTerritoryNames, isSouthAmericaTerritoryCountry } from './south-america-territory-names.js'
import { drawStreet } from './street-random.js'

type Style = 'english' | 'french' | 'spanish' | 'mexican' | 'puertoRican'
  | 'portuguese' | 'aruban' | 'curacaoan'
  | 'surinamese' | 'greenlandic'

const americanStreetStyles: Record<string, Style> = {
  AG: 'english', BB: 'english', BM: 'english', BS: 'english', BZ: 'english',
  CA: 'english', CR: 'spanish', CU: 'spanish', DM: 'english', DO: 'spanish',
  GD: 'english', GT: 'spanish', HN: 'spanish', HT: 'french', JM: 'english',
  KN: 'english', LC: 'english', MX: 'mexican', NI: 'spanish', PA: 'spanish',
  SV: 'spanish', TT: 'english', US: 'english', VC: 'english', AW: 'aruban',
  CW: 'curacaoan', GL: 'greenlandic', GP: 'french', MQ: 'french', PR: 'puertoRican',
  VI: 'english', AR: 'spanish', BO: 'spanish', BR: 'portuguese', CL: 'spanish',
  CO: 'spanish', EC: 'spanish', GY: 'english', PE: 'spanish', PY: 'spanish',
  SR: 'surinamese', UY: 'spanish', VE: 'spanish', FK: 'english', GF: 'french',
}

export function hasSyntheticAmericanStreet(country: string): boolean {
  return Object.hasOwn(americanStreetStyles, country)
}

function styleForCity(city: City): Style | undefined {
  if (city.country === 'CA' && city.region === 'Quebec') return 'french'
  return americanStreetStyles[city.country]
}

function nameParts(country: string, key: string): { family: string; given: string } | null {
  const pool = isNorthAmericaReviewedCountry(country) ? northAmericaReviewedNames[country]
    : isNorthAmericaTerritoryCountry(country) ? northAmericaTerritoryNames[country]
      : isSouthAmericaReviewedCountry(country) ? southAmericaReviewedNames[country]
        : isSouthAmericaTerritoryCountry(country) ? southAmericaTerritoryNames[country] : null
  if (!pool) return null
  return {
    family: pool.family[drawStreet(key, `street-name:${country}`, pool.family.length)],
    given: pool.male[drawStreet(key, `street-given:${country}`, pool.male.length)],
  }
}

function render(style: Style, person: string, family: string, variant: number, number: number): string {
  switch (style) {
    case 'english': return `${number} ${person} ${['Street', 'Road', 'Avenue'][variant]}`
    case 'french': return `${number} ${['Rue', 'Avenue', 'Boulevard'][variant]} ${person}`
    case 'spanish': return `${['Calle', 'Avenida', 'Pasaje'][variant]} ${person}, ${number}`
    case 'mexican': return `${['Calle', 'Avenida', 'Privada'][variant]} ${person}, ${number}`
    case 'puertoRican': return `${['Calle', 'Avenida', 'Paseo'][variant]} ${person}, ${number}`
    case 'portuguese': return `${['Rua', 'Avenida', 'Travessa'][variant]} ${person}, ${number}`
    case 'aruban': return `Caya ${person} ${number}`
    case 'curacaoan': return `Kaya ${person} ${number}`
    case 'surinamese': return `${family}${variant === 1 ? 'weg' : 'straat'} ${number}`
    case 'greenlandic': return `B-${String(number).padStart(4, '0')}`
  }
}

export function americanStreetLineForCity(city: City, key: string): string | null {
  const style = styleForCity(city)
  if (!style) return null
  const number = drawStreet(key, `building:${city.country}`, style === 'greenlandic' ? 9999 : 240) + 1
  if (style === 'greenlandic') return render(style, '', '', 0, number)
  const parts = nameParts(city.country, key)
  if (!parts) return null
  const { family, given } = parts
  const person = drawStreet(key, `street-person:${city.country}`, 3) === 0 || given === family
    ? family : `${given} ${family}`
  const variant = drawStreet(key, `street-form:${city.country}`, 3)
  return render(style, person, family, variant, number)
}
