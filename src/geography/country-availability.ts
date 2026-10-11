import { postalCodeForCity } from './address-data.js'
import { listCities } from './cities.js'
import { listCountries } from './countries.js'
import { listCoverage } from './coverage.js'

export type CountryAvailability = {
  code: string
  name: string
  profile: 'available' | 'pending-name-review' | 'unavailable'
  cities: number
  citiesWithPostcode: number
  phone: 'reserved-range' | 'format-valid' | 'unavailable' | 'not-applicable'
}

export function listCountryAvailability(): CountryAvailability[] {
  const coverage = new Map(listCoverage().map((row) => [row.country, row]))
  return listCountries().map((country): CountryAvailability => {
    const cities = listCities(country.code)
    const cell = coverage.get(country.code)!
    return {
      code: country.code,
      name: country.name,
      profile: cell.profileGeneration,
      cities: cities.length,
      citiesWithPostcode: cities.filter((city) => postalCodeForCity(city) !== null).length,
      phone: cell.phone.status === 'ingested' ? 'reserved-range'
        : cell.phone.status === 'partial' ? 'format-valid'
          : cell.phone.status === 'not-applicable' ? 'not-applicable' : 'unavailable',
    }
  }).sort((left, right) => left.code.localeCompare(right.code))
}
