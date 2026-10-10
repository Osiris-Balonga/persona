import type { City } from './cities.js'
import { africaReviewedNames, isAfricaReviewedCountry } from './africa-reviewed-names.js'
import { ethiopiaGivenNames } from './ethiopia-names.js'
import { malawiNames } from './malawi-names.js'
import { drawStreet } from './street-random.js'
import { europeanStreetLineForCity, hasSyntheticEuropeanStreet } from './europe-street-data.js'
import { asianStreetLineForCity, hasSyntheticAsianStreet } from './asia-street-data.js'
import { americanStreetLineForCity, hasSyntheticAmericanStreet } from './america-street-data.js'
import { oceanianStreetLineForCity, hasSyntheticOceanianStreet } from './oceania-street-data.js'

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

export function hasSyntheticStreet(country: string): boolean {
  return hasSyntheticAfricanStreet(country) || hasSyntheticEuropeanStreet(country)
    || hasSyntheticAsianStreet(country) || hasSyntheticAmericanStreet(country)
    || hasSyntheticOceanianStreet(country)
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
  if (!style) return europeanStreetLineForCity(city, key) ?? asianStreetLineForCity(city, key)
    ?? americanStreetLineForCity(city, key) ?? oceanianStreetLineForCity(city, key)
  const names = streetNames(city.country)
  if (!names.length) return null
  const family = names[drawStreet(key, `street-name:${city.country}`, names.length)]
  const given = givenNames(city.country)
  const first = given[drawStreet(key, `street-given:${city.country}`, given.length)]
  const name = drawStreet(key, `street-person:${city.country}`, 3) === 0 || first === family
    ? family : `${first} ${family}`
  const variant = drawStreet(key, `street-form:${city.country}`, 3)
  const number = drawStreet(key, `building:${city.country}`, 240) + 1
  const street = streetLabel(style, name, variant)
  return style === 'english' ? `${number} ${street}` : `${number}, ${street}`
}
