import type { City } from './cities.js'
import { addressRules, cityPostalCodes } from './address-rules-data.js'
import { streetLineForCity } from './street-data.js'

const brazilStateAbbreviations: Record<string, string> = {
  'São Paulo': 'SP', 'Rio de Janeiro': 'RJ', 'Minas Gerais': 'MG', Bahia: 'BA', Ceará: 'CE',
  Amazonas: 'AM', 'Federal District': 'DF', Paraná: 'PR', Pernambuco: 'PE', Goiás: 'GO',
  Pará: 'PA', 'Rio Grande do Sul': 'RS',
}

export function addressRule(country: string) {
  return addressRules[country]
}

export function postalCodeForCity(city: City): string | null {
  if (city.country === 'PN' && city.name === 'Adamstown') return 'PCRN 1ZZ'
  if (city.country === 'FK') return 'FIQQ 1ZZ'
  if (city.country === 'CR' && city.geonameId === 3621849) return null
  if (city.country === 'AU' && city.geonameId === 2147714) return '2000'
  const postalCode = cityPostalCodes[city.geonameId] ?? null
  if (city.country === 'BR' && postalCode && /^\d{5}-000$/.test(postalCode)) return null
  return postalCode
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
  const line1 = streetLineForCity(city, key)
  const cityIsMatchingRegion = city.country !== 'BR' && rule.format.includes('%S')
    && city.region?.replace(/\s*\([^)]*\)$/, '') === city.name
  const region = rule.format.includes('%S') ? city.region : null
  const postalCode = postalCodeForCity(city)
  const countryFormat = cityIsMatchingRegion && rule.format.includes('%C')
    ? rule.format.replace('%S', '')
    : rule.format.replace(/%S%C/g, '%S, %C').replace(/%C%S/g, '%C, %S')
  const format = postalCode === null
    ? countryFormat.replace(/(?<!%)[A-Z]{1,3}[ -]?%Z|-%Z|〒\s*%Z|%Z/g, '') : countryFormat
  const partial = formatAddress(format, {
    A: line1 ?? '', C: city.name,
    S: city.country === 'BR' && region ? brazilStateAbbreviations[region] ?? region : region ?? '',
    Z: postalCode ?? '',
  })
  const formatted = partial.includes(city.name) ? partial : [partial, city.name].filter(Boolean).join('\n')
  return { line1, city: city.name, region, postalCode, country: city.country, formatted }
}
