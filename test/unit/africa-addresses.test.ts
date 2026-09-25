import { describe, expect, it } from 'vitest'
import { africaReviewedNames } from '../../src/geography/africa-reviewed-names.js'
import { fictionalAddress } from '../../src/geography/address-data.js'
import { listCities } from '../../src/geography/cities.js'

const africanCodes = [...Object.keys(africaReviewedNames), 'ET', 'MW']
const keys = Array.from({ length: 24 }, (_, index) => index.toString(16).padStart(16, '0').repeat(4))

describe('plausible synthetic African street lines', () => {
  it('provides a street line for every sampled city in the 58 African codes', () => {
    expect(africanCodes).toHaveLength(58)
    for (const code of africanCodes) {
      const cities = listCities(code)
      expect(cities.length, code).toBeGreaterThan(0)
      for (const city of cities) {
        const address = fictionalAddress(city, keys[0])
        expect(address.line1, `${code}/${city.name}`).toBeTruthy()
        expect(address.formatted, `${code}/${city.name}`).toContain(city.name)
        expect(address.formatted, `${code}/${city.name}`).not.toMatch(/Example|Placeholder|undefined|null/i)
      }
    }
  })

  it('varies street lines by seed while keeping one seed repeatable', () => {
    for (const code of africanCodes) {
      const city = listCities(code)[0]
      const lines = keys.map((key) => fictionalAddress(city, key).line1)
      expect(new Set(lines).size, code).toBeGreaterThanOrEqual(6)
      expect(new Set(lines.map((line) => line?.replace(/^\d{1,3},? /, ''))).size, code).toBeGreaterThanOrEqual(4)
      expect(fictionalAddress(city, keys[0]).line1).toBe(lines[0])
    }
  })

  it('uses country-appropriate road vocabulary in representative regions', () => {
    for (const [code, pattern] of [
      ['CG', /\b(?:Rue|Avenue|Boulevard)\b/],
      ['MW', /\b(?:Road|Street|Avenue)\b/],
      ['MZ', /\b(?:Rua|Avenida|Travessa)\b/],
      ['GQ', /\b(?:Calle|Avenida)\b/],
      ['EH', /^\d{1,3}, شارع /],
      ['RW', /^\d{1,3} .+ (?:Road|Street|Avenue)$/],
    ] as const) {
      const city = listCities(code)[0]
      expect(fictionalAddress(city, keys[1]).line1, code).toMatch(pattern)
    }
  })

  it('avoids a tiny repeating street pool in a hundred Congo profiles', () => {
    const city = listCities('CG')[0]
    const labels = Array.from({ length: 100 }, (_, index) => {
      const key = index.toString(16).padStart(16, '0').repeat(4)
      return fictionalAddress(city, key).line1?.replace(/^\d{1,3},? /, '')
    })
    expect(new Set(labels).size).toBeGreaterThan(30)
  })
})
