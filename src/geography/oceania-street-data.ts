import type { City } from './cities.js'
import { oceaniaReviewedNames, isOceaniaReviewedCountry } from './oceania-reviewed-names.js'
import { oceaniaTerritoryNames, isOceaniaTerritoryCountry } from './oceania-territory-names.js'
import { drawStreet } from './street-random.js'

type Style = 'english' | 'french' | 'portuguese'

const oceanianStreetStyles: Record<string, Style> = {
  AU: 'english', CK: 'english', FJ: 'english', FM: 'english', NR: 'english',
  NZ: 'english', PG: 'english', PW: 'english', SB: 'english', TL: 'portuguese',
  VU: 'english', WS: 'english', AS: 'english', GU: 'english', NC: 'french',
  PF: 'french',
}

export function hasSyntheticOceanianStreet(country: string): boolean {
  return Object.hasOwn(oceanianStreetStyles, country)
}

function nameParts(country: string, key: string): { family: string; given: string } | null {
  const pool = isOceaniaReviewedCountry(country) ? oceaniaReviewedNames[country]
    : isOceaniaTerritoryCountry(country) ? oceaniaTerritoryNames[country] : null
  if (!pool) return null
  return {
    family: pool.family[drawStreet(key, `street-name:${country}`, pool.family.length)],
    given: pool.male[drawStreet(key, `street-given:${country}`, pool.male.length)],
  }
}

export function oceanianStreetLineForCity(city: City, key: string): string | null {
  const style = oceanianStreetStyles[city.country]
  if (!style) return null
  const parts = nameParts(city.country, key)
  if (!parts) return null
  const { family, given } = parts
  const person = drawStreet(key, `street-person:${city.country}`, 3) === 0 || given === family
    ? family : `${given} ${family}`
  const variant = drawStreet(key, `street-form:${city.country}`, 3)
  const number = drawStreet(key, `building:${city.country}`, 240) + 1
  if (style === 'french') return `${number} ${['Rue', 'Avenue', 'Boulevard'][variant]} ${person}`
  if (style === 'portuguese') return `${['Rua', 'Avenida', 'Travessa'][variant]} ${person}, ${number}`
  return `${number} ${person} ${['Street', 'Road', 'Avenue'][variant]}`
}
