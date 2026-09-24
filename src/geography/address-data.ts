import type { City } from './cities.js'
import { addressRules, cityPostalCodes } from './address-rules-data.js'
import { nameContextData } from './name-context-data.js'

export function addressRule(country: string) {
  return addressRules[country]
}

export function postalCodeForCity(city: City): string | null {
  if (city.country === 'PN' && city.name === 'Adamstown') return 'PCRN 1ZZ'
  return cityPostalCodes[city.geonameId] ?? null
}

function streetLine(country: string, number: number): string {
  if (country === 'PN') return 'Example Place'
  const locale = streetLanguageForCountry(country)
  if (locale.startsWith('fr')) return `${number} rue de l'Exemple`
  if (locale.startsWith('es')) return `Calle del Ejemplo ${number}`
  if (locale.startsWith('pt')) return `Rua do Exemplo, ${number}`
  if (locale.startsWith('de')) return `Beispielstraße ${number}`
  if (locale.startsWith('ja')) return `架空通り${number}番地`
  return `${number} Example Street`
}

export function streetLanguageForCountry(country: string): string {
  return nameContextData[country]?.pools[0]?.locale.slice(0, 2) ?? 'en'
}

function formatAddress(format: string, components: Record<string, string>): string {
  return format.replace(/%[A-Z]|%n/g, (marker) => marker === '%n' ? '\n' : components[marker[1]] ?? '')
    .split('\n').map((line) => line.replace(/\s+,/g, ',').replace(/^\s*[,/-]\s*/g, '')
      .replace(/\s*[,/-]\s*$/g, '').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean).join('\n')
}

export function fictionalAddress(city: City, key: string) {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid generation key')
  const rule = addressRule(city.country)
  if (!rule) throw new RangeError(`No address rule for ${city.country}`)
  const number = Number.parseInt(key.slice(0, 12), 16) % 199 + 1
  const street = streetLine(city.country, number)
  const cityIsMatchingRegion = rule.format.includes('%S') && city.region === city.name
  const line1 = rule.format.includes('%C') || cityIsMatchingRegion ? street : `${city.name} ${street}`
  const region = rule.format.includes('%S') ? city.region : null
  const postalCode = postalCodeForCity(city)
  const countryFormat = city.country === 'MZ' ? rule.format.replace(/%C%S/g, '%C, %S') : rule.format
  const format = postalCode === null
    ? countryFormat.replace(/(?<!%)[A-Z]{1,3}-%Z|-%Z|〒\s*%Z|%Z/g, '') : countryFormat
  const formatted = formatAddress(format, {
    A: line1, C: city.name, S: region ?? '', Z: postalCode ?? '',
  })
  return { line1, city: city.name, region, postalCode, country: city.country, formatted }
}
