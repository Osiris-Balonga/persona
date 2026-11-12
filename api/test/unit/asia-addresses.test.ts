import { describe, expect, it } from 'vitest'
import { fictionalAddress } from '../../src/geography/address-data.js'
import { getCity, listCities } from '../../src/geography/cities.js'
import { asiaReviewedNames } from '../../src/geography/asia-reviewed-names.js'
import { asiaWestNames } from '../../src/geography/asia-west-names.js'
import { asiaEastNames } from '../../src/geography/asia-east-names.js'
import { asiaCentralNames } from '../../src/geography/asia-central-names.js'
import { asiaAdditionalNames } from '../../src/geography/asia-additional-names.js'

const asianCodes = [
  ...Object.keys(asiaReviewedNames), ...Object.keys(asiaWestNames), ...Object.keys(asiaEastNames),
  ...Object.keys(asiaCentralNames), ...Object.keys(asiaAdditionalNames), 'BT', 'MM',
]
const keys = Array.from({ length: 24 }, (_, index) => index.toString(16).padStart(16, '0').repeat(4))

describe('plausible synthetic Asian address lines', () => {
  it('provides a street line for every sampled city where Asian profiles are available', () => {
    expect(new Set(asianCodes).size).toBe(40)
    expect(asianCodes.reduce((sum, code) => sum + listCities(code).length, 0)).toBe(482)
    for (const code of asianCodes) {
      for (const city of listCities(code)) {
        const address = fictionalAddress(city, keys[0])
        expect(address.line1, `${code}/${city.name}`).toBeTruthy()
        expect(address.formatted, `${code}/${city.name}`).toContain(city.name)
        expect(address.formatted, `${code}/${city.name}`).not.toMatch(/Example|Placeholder|undefined|null/i)
      }
    }
  })

  it('has repeatable but varied street labels in every country', () => {
    for (const code of asianCodes) {
      const city = listCities(code)[0]
      const lines = keys.map((key) => fictionalAddress(city, key).line1)
      const streetLabels = lines.map((line) => line!.replace(/[\d:,\-]+/g, '').trim())
      expect(new Set(streetLabels).size, code).toBeGreaterThanOrEqual(4)
      expect(fictionalAddress(city, keys[0]).line1).toBe(lines[0])
    }
  })

  it('uses locally recognizable road or block forms in representative countries', () => {
    const samples = [
      ['IN', 'New Delhi', /(?:Road|Marg|Lane)/],
      ['AE', 'Dubai', /(?:Street|Road|Avenue)/],
      ['SA', 'Riyadh', /(?:Street|Road|Avenue)/],
      ['JP', 'Tokyo', /(?:Chome|Dori|丁目)/],
      ['KR', 'Seoul', /(?:-ro|-gil)/],
      ['KP', 'Pyongyang', /(?:Street|Avenue)/],
      ['CN', 'Shanghai', /(?: Lu| Jie)/],
      ['VN', 'Ho Chi Minh City', /Đường/],
      ['TH', 'Bangkok', /(?:Thanon|Soi)/],
      ['ID', 'Jakarta', /Jl\./],
      ['BT', 'Thimphu', /Lam/],
      ['MM', 'Yangon', /(?:Road|Lan)/],
    ] as const
    for (const [code, name, pattern] of samples) {
      const city = getCity(code, name)
      expect(city, `${code}/${name}`).toBeDefined()
      expect(fictionalAddress(city!, keys[1]).line1, `${code}/${name}`).toMatch(pattern)
    }
  })

  it('keeps the ten Asian countries pending local name review without generated street lines', () => {
    for (const code of ['BN', 'CC', 'KH', 'LA', 'MN', 'MO', 'MY', 'OM', 'TJ', 'TM']) {
      const city = listCities(code)[0]
      expect(fictionalAddress(city, keys[0]).line1, code).toBeNull()
    }
  })

  it('uses a two-part personal name in Vietnamese street labels', () => {
    const city = getCity('VN', 'Ho Chi Minh City')!
    for (const key of keys) {
      expect(fictionalAddress(city, key).line1).toMatch(/^\d+ Đường \S+ \S+/u)
    }
  })
})
