import { describe, expect, it } from 'vitest'
import { listCountryAvailability } from '../../src/geography/country-availability.js'

describe('country availability', () => {
  it('distinguishes profile readiness, city-level postcodes, and phone safety', () => {
    const rows = listCountryAvailability()
    expect(rows).toHaveLength(249)

    const byCode = new Map(rows.map((row) => [row.code, row]))
    expect(byCode.get('CG')).toMatchObject({
      profile: 'available', cities: 12, citiesWithPostcode: 0, phone: 'format-valid',
    })
    expect(byCode.get('FR')).toMatchObject({
      profile: 'available', cities: 12, citiesWithPostcode: 10, phone: 'reserved-range',
    })
    expect(byCode.get('PN')).toMatchObject({
      profile: 'pending-name-review', cities: 1, citiesWithPostcode: 1, phone: 'unavailable',
    })
    expect(byCode.get('AQ')).toMatchObject({
      profile: 'unavailable', cities: 0, citiesWithPostcode: 0, phone: 'not-applicable',
    })
  })

  it('does not describe a country as fully covered when only some sampled cities have postcodes', () => {
    const france = listCountryAvailability().find((row) => row.code === 'FR')!
    expect(france.citiesWithPostcode).toBeLessThan(france.cities)
  })
})
