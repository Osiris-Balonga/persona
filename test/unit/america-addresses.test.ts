import { describe, expect, it } from 'vitest'
import { fictionalAddress } from '../../src/geography/address-data.js'
import { getCity, listCities } from '../../src/geography/cities.js'
import { northAmericaReviewedNames } from '../../src/geography/north-america-reviewed-names.js'
import { northAmericaTerritoryNames } from '../../src/geography/north-america-territory-names.js'
import { southAmericaReviewedNames } from '../../src/geography/south-america-reviewed-names.js'
import { southAmericaTerritoryNames } from '../../src/geography/south-america-territory-names.js'

const americanCodes = [
  ...Object.keys(northAmericaReviewedNames), ...Object.keys(northAmericaTerritoryNames),
  ...Object.keys(southAmericaReviewedNames), ...Object.keys(southAmericaTerritoryNames),
]
const keys = Array.from({ length: 24 }, (_, index) => index.toString(16).padStart(16, '0').repeat(4))

describe('plausible synthetic American address lines', () => {
  it('covers every sampled city where American profiles are available', () => {
    expect(new Set(americanCodes).size).toBe(45)
    expect(americanCodes.reduce((sum, code) => sum + listCities(code).length, 0)).toBe(518)
    for (const code of americanCodes) {
      for (const city of listCities(code)) {
        const address = fictionalAddress(city, keys[0])
        expect(address.line1, `${code}/${city.name}`).toBeTruthy()
        expect(address.formatted, `${code}/${city.name}`).toContain(city.name)
        expect(address.formatted, `${code}/${city.name}`).not.toMatch(/Example|Placeholder|undefined|null/i)
      }
    }
  })

  it('has repeatable and varied street labels, apart from building numbers', () => {
    for (const code of americanCodes) {
      const city = listCities(code)[0]
      const lines = keys.map((key) => fictionalAddress(city, key).line1!)
      if (code === 'GL') {
        expect(new Set(lines).size).toBeGreaterThanOrEqual(12)
        continue
      }
      const labels = lines.map((line) => line.replace(/[\d:,\-]+/g, '').trim())
      expect(new Set(labels).size, code).toBeGreaterThanOrEqual(4)
      expect(fictionalAddress(city, keys[0]).line1).toBe(lines[0])
    }
  })

  it('uses appropriate road and building forms in representative places', () => {
    const samples = [
      ['US', 'New York City', /^\d+ .+ (?:Street|Road|Avenue)$/],
      ['CA', 'Toronto', /^\d+ .+ (?:Street|Road|Avenue)$/],
      ['CA', 'Montréal', /^\d+ (?:Rue|Avenue|Boulevard) /],
      ['MX', 'Mexico City', /^(?:Calle|Avenida|Privada) .+, \d+$/],
      ['CL', 'Santiago', /^(?:Calle|Avenida|Pasaje) .+, \d+$/],
      ['BR', 'São Paulo', /^(?:Rua|Avenida|Travessa) .+, \d+$/],
      ['AW', 'Oranjestad', /^Caya .+ \d+$/],
      ['CW', 'Willemstad', /^Kaya .+ \d+$/],
      ['GL', 'Nuuk', /^B-\d{4}$/],
      ['GF', 'Cayenne', /^\d+ (?:Rue|Avenue|Boulevard) /],
      ['PR', 'San Juan', /^(?:Calle|Avenida|Paseo) .+, \d+$/],
      ['SR', 'Paramaribo', /(?:straat|weg) \d+$/],
    ] as const
    for (const [code, name, pattern] of samples) {
      const city = getCity(code, name)
      expect(city, `${code}/${name}`).toBeDefined()
      expect(fictionalAddress(city!, keys[1]).line1, `${code}/${name}`).toMatch(pattern)
    }
  })

  it('leaves the ten North American territories pending profile-name review unchanged', () => {
    for (const code of ['AI', 'BL', 'BQ', 'KY', 'MF', 'MS', 'PM', 'SX', 'TC', 'VG']) {
      expect(fictionalAddress(listCities(code)[0], keys[0]).line1, code).toBeNull()
    }
  })

  it('uses passage wording rather than private-road wording outside Mexico', () => {
    for (const code of ['AR', 'CL', 'CO', 'PE', 'UY']) {
      const city = listCities(code)[0]
      for (const key of keys) {
        expect(fictionalAddress(city, key).line1, code).not.toContain('Privada')
      }
    }
  })
})
