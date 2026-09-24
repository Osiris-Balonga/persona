import { countryData, registryEdition } from './country-data.js'

export { registryEdition }

export type Country = (typeof countryData)[number]

const byCode = new Map<string, Country>(countryData.map((country) => [country.code, country]))

export function listCountries(): readonly Country[] {
  return countryData
}

export function getCountry(code: string): Country | undefined {
  return byCode.get(code)
}
