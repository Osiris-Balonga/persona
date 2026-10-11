import { describe, expect, it } from 'vitest'
import { getExampleNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'
import mobileExamples from 'libphonenumber-js/examples.mobile'
import { fictionalEmail, fictionalPhone, nanpTerritoryAreas } from '../../src/geography/fictional-contact.js'
import { listCities } from '../../src/geography/cities.js'
import { listCountries } from '../../src/geography/countries.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'

const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const otherKey = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

describe('contact values for the second people contract', () => {
  it('uses a five-character disambiguator, initials, and a domain-independent local part', () => {
    const first = fictionalEmail('Élodie', 'N’Diaye', key)
    expect(first).toMatch(/^e\.ndiaye\.[a-z0-9]{5}@example\.test$/)
    expect(fictionalEmail('Élodie', 'N’Diaye', key, 'yopmail.com'))
      .toBe(first.replace('@example.test', '@yopmail.com'))
    expect(fictionalEmail('Élodie', 'N’Diaye', otherKey)).not.toBe(first)
  })

  it('uses a distinct five-character suffix for equal names at different response positions', () => {
    const first = fictionalEmail('Maya', 'Banda', key, 'example.test', 0)
    const second = fictionalEmail('Maya', 'Banda', key, 'example.test', 1)
    expect(first).not.toBe(second)
    expect(first).toMatch(/^m\.banda\.[a-z0-9]{5}@example\.test$/)
    expect(second).toMatch(/^m\.banda\.[a-z0-9]{5}@example\.test$/)
  })

  it('keeps reviewed reserved ranges ahead of example-based numbers', () => {
    expect(fictionalPhone('US', 'Washington', key)).toMatch(/^\+120255501\d{2}$/)
    expect(fictionalPhone('GB', 'London', key)).toMatch(/^\+447700900\d{3}$/)
  })

  it.each([['AF', 'Kabul'], ['LY', 'Tripoli'], ['CG', 'Brazzaville'], ['RW', 'Kigali']])(
    'produces a valid country-format mobile sample for %s', (country, city) => {
      const phone = fictionalPhone(country, city, key)
      expect(phone).toMatch(/^\+[1-9]\d+$/)
      const parsed = parsePhoneNumberFromString(phone!)
      expect(parsed?.country).toBe(country)
      expect(parsed?.isValid()).toBe(true)
      expect(fictionalPhone(country, city, key)).toBe(phone)
      expect(fictionalPhone(country, city, otherKey)).not.toBe(phone)
      expect(fictionalPhone(country, 'Unknown city', key)).toBeNull()
    },
  )

  it('has a mobile example for each profile-eligible country', () => {
    const eligible = listCountries().filter(canGenerateProfile)
    expect(eligible).toHaveLength(209)
    for (const country of eligible) {
      expect(getExampleNumber(country.code as CountryCode, mobileExamples), country.code).toBeDefined()
    }
  })

  it('makes valid E.164 fallback numbers for every eligible country without a reserved range', () => {
    const reserved = new Set(['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IE', 'SE', 'NO', ...Object.keys(nanpTerritoryAreas)])
    for (const country of listCountries().filter((item) => canGenerateProfile(item) && !reserved.has(item.code))) {
      const city = listCities(country.code)[0]
      expect(city, country.code).toBeDefined()
      const phone = fictionalPhone(country.code, city.name, key)
      expect(phone, country.code).toMatch(/^\+[1-9]\d+$/)
      const parsed = parsePhoneNumberFromString(phone!)
      expect(parsed?.countryCallingCode, country.code).toBe(country.callingCode?.slice(1))
      expect(parsed?.isValid(), country.code).toBe(true)
    }
  })
})
