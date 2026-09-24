import { countryData, registryEdition } from './country-data.js'

export { registryEdition }

export interface Country {
  code: string
  alpha3: string
  numeric: string
  name: string
  callingCode: string | null
  generation: 'eligible' | 'unavailable'
}

const byCode = new Map<string, Country>(countryData.map((country) => [country.code, country]))

export function listCountries(): readonly Country[] {
  return countryData
}

export function getCountry(code: string): Country | undefined {
  return byCode.get(code)
}
