import { describe, expect, it } from 'vitest'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { buildApp } from '../../src/app.js'

describe('phone fallback for countries without a reserved fictional range', () => {
  it.each([['AF', 'Kabul'], ['LY', 'Tripoli'], ['CG', 'Brazzaville'], ['RW', 'Kigali']])(
    'returns a country-format number for %s', async (country, city) => {
      const app = buildApp()
      try {
        const response = await app.inject({ method: 'GET',
          url: `/people?nationality=${country}&city=${encodeURIComponent(city)}&seed=phone-review&asOf=2026-09-28` })
        expect(response.statusCode).toBe(200)
        const number = response.json().results[0].phone
        expect(typeof number).toBe('string')
        const parsed = parsePhoneNumberFromString(number)
        expect(parsed?.country).toBe(country)
        expect(parsed?.isValid()).toBe(true)
      } finally { await app.close() }
    },
  )
})
