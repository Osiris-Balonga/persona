import type { City } from './cities.js'
import { africaReviewedNames, isAfricaReviewedCountry } from './africa-reviewed-names.js'
import { ethiopiaGivenNames } from './ethiopia-names.js'
import { malawiNames } from './malawi-names.js'

type StreetStyle = 'french' | 'english' | 'portuguese' | 'spanish' | 'arabic' | 'somali' | 'swahili' | 'malagasy'

// Editorial street forms, not a claim that the assembled address exists.
// Name components come from the reviewed country catalogs.
const africanStreetStyles: Record<string, StreetStyle> = {
  AO: 'portuguese', BF: 'french', BI: 'french', BJ: 'french', BW: 'english',
  CD: 'french', CF: 'french', CG: 'french', CI: 'french', CM: 'french',
  CV: 'portuguese', DJ: 'french', DZ: 'french', EG: 'english', EH: 'arabic',
  ER: 'english', ET: 'english', GA: 'french', GH: 'english', GM: 'english',
  GN: 'french', GQ: 'spanish', GW: 'portuguese', KE: 'english', KM: 'french',
  LR: 'english', LS: 'english', LY: 'english', MA: 'french', MG: 'malagasy',
  ML: 'french', MR: 'french', MU: 'english', MW: 'english', MZ: 'portuguese',
  NA: 'english', NE: 'french', NG: 'english', RE: 'french', RW: 'english',
  SC: 'english', SD: 'english', SH: 'english', SL: 'english', SN: 'french',
  SO: 'somali', SS: 'english', ST: 'portuguese', SZ: 'english', TD: 'french',
  TG: 'french', TN: 'french', TZ: 'swahili', UG: 'english', YT: 'french',
  ZA: 'english', ZM: 'english', ZW: 'english',
}

export function hasSyntheticAfricanStreet(country: string): boolean {
  return Object.hasOwn(africanStreetStyles, country)
}

function draw(key: string, salt: string, range: number): number {
  let hash = 2166136261
  for (const character of `${salt}:${key}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d) >>> 0
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b) >>> 0
  hash = (hash ^ (hash >>> 16)) >>> 0
  return hash % range
}

function streetNames(country: string): readonly string[] {
  if (country === 'ET') return ethiopiaGivenNames.male
  if (country === 'MW') return malawiNames.family
  return isAfricaReviewedCountry(country) ? africaReviewedNames[country].family : []
}

function givenNames(country: string): readonly string[] {
  if (country === 'ET') return [...ethiopiaGivenNames.female, ...ethiopiaGivenNames.male]
  if (country === 'MW') return malawiNames.given
  return isAfricaReviewedCountry(country)
    ? [...africaReviewedNames[country].female, ...africaReviewedNames[country].male] : []
}

function streetLabel(style: StreetStyle, name: string, variant: number): string {
  switch (style) {
    case 'french': return `${['Rue', 'Avenue', 'Boulevard'][variant]} ${name}`
    case 'english': return `${name} ${['Road', 'Street', 'Avenue'][variant]}`
    case 'portuguese': return `${['Rua', 'Avenida', 'Travessa'][variant]} ${name}`
    case 'spanish': return `${['Calle', 'Avenida', 'Paseo'][variant]} ${name}`
    case 'arabic': return `شارع ${name}`
    case 'somali': return `Waddada ${name}`
    case 'swahili': return `Barabara ya ${name}`
    case 'malagasy': return `Lalana ${name}`
  }
}

export function streetLineForCity(city: City, key: string): string | null {
  const style = africanStreetStyles[city.country]
  if (!style) return null
  const names = streetNames(city.country)
  if (!names.length) return null
  const family = names[draw(key, `street-name:${city.country}`, names.length)]
  const given = givenNames(city.country)
  const first = given[draw(key, `street-given:${city.country}`, given.length)]
  const name = draw(key, `street-person:${city.country}`, 3) === 0 || first === family
    ? family : `${first} ${family}`
  const variant = draw(key, `street-form:${city.country}`, 3)
  const number = draw(key, `building:${city.country}`, 240) + 1
  const street = streetLabel(style, name, variant)
  return style === 'english' ? `${number} ${street}` : `${number}, ${street}`
}
