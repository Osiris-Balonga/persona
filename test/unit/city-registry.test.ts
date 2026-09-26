import { describe, expect, it } from 'vitest'
import { getCity, listCities, cityEdition } from '../../src/geography/cities.js'
import { listCountries } from '../../src/geography/countries.js'

describe('versioned city registry', () => {
  it('has a sourced locality for every eligible country and none for unavailable resident locations', () => {
    expect(cityEdition).toBe('2026-09-24')
    for (const country of listCountries()) {
      const cities = listCities(country.code)
      expect(cities.length > 0).toBe(country.generation === 'eligible')
      expect(cities.every((city) => city.country === country.code && city.name.length > 0)).toBe(true)
      expect(new Set(cities.map((city) => city.geonameId)).size).toBe(cities.length)
      expect(cities.every((city) => city.latitude >= -90 && city.latitude <= 90 && city.longitude >= -180 && city.longitude <= 180)).toBe(true)
    }
  })

  it('keeps recognizable small-territory and national cities under their correct ISO codes', () => {
    expect(getCity('CG', 'Brazzaville')).toMatchObject({ country: 'CG', name: 'Brazzaville' })
    expect(getCity('PN', 'Adamstown')).toMatchObject({ country: 'PN', name: 'Adamstown' })
    expect(getCity('GB', 'London')).toMatchObject({ country: 'GB', name: 'London' })
    expect(getCity('US', 'London')).toBeUndefined()
    expect(getCity('US', 'Washington')).toMatchObject({ region: 'District of Columbia' })
    expect(listCities('AQ')).toEqual([])
  })
})
