import { describe, expect, it } from 'vitest'
import { fictionalAddress } from '../../src/geography/address-data.js'
import { getCity, listCities } from '../../src/geography/cities.js'
import { oceaniaReviewedNames } from '../../src/geography/oceania-reviewed-names.js'
import { oceaniaTerritoryNames } from '../../src/geography/oceania-territory-names.js'

const oceanianCodes = [...Object.keys(oceaniaReviewedNames), ...Object.keys(oceaniaTerritoryNames)]
const keys = Array.from({ length: 24 }, (_, index) => index.toString(16).padStart(16, '0').repeat(4))

describe('plausible synthetic Oceanian address lines', () => {
  it('covers every sampled city where Oceanian profiles are available', () => {
    expect(new Set(oceanianCodes).size).toBe(16)
    expect(oceanianCodes.reduce((sum, code) => sum + listCities(code).length, 0)).toBe(178)
    for (const code of oceanianCodes) {
      for (const city of listCities(code)) {
        const address = fictionalAddress(city, keys[0])
        expect(address.line1, `${code}/${city.name}`).toBeTruthy()
        expect(address.formatted, `${code}/${city.name}`).toContain(city.name)
        expect(address.formatted, `${code}/${city.name}`).not.toMatch(/Example|Placeholder|undefined|null/i)
      }
    }
  })

  it('varies street labels independently of building numbers', () => {
    for (const code of oceanianCodes) {
      const city = listCities(code)[0]
      const lines = keys.map((key) => fictionalAddress(city, key).line1!)
      const labels = lines.map((line) => line.replace(/[\d:,\-]+/g, '').trim())
      expect(new Set(labels).size, code).toBeGreaterThanOrEqual(4)
      expect(fictionalAddress(city, keys[0]).line1).toBe(lines[0])
    }
  })

  it('uses locally recognizable road vocabulary in representative places', () => {
    const samples = [
      ['AU', 'Sydney', /^\d+ .+ (?:Street|Road|Avenue)$/],
      ['NZ', 'Auckland', /^\d+ .+ (?:Street|Road|Avenue)$/],
      ['FJ', 'Nasinu', /^\d+ .+ (?:Street|Road|Avenue)$/],
      ['TL', 'Dili', /^(?:Rua|Avenida|Travessa) .+, \d+$/],
      ['NC', 'Nouméa', /^\d+ (?:Rue|Avenue|Boulevard) /],
      ['PF', 'Faaa', /^\d+ (?:Rue|Avenue|Boulevard) /],
      ['AS', 'Pago Pago', /^\d+ .+ (?:Street|Road|Avenue)$/],
    ] as const
    for (const [code, name, pattern] of samples) {
      const city = getCity(code, name)
      expect(city, `${code}/${name}`).toBeDefined()
      expect(fictionalAddress(city!, keys[1]).line1, `${code}/${name}`).toMatch(pattern)
    }
  })

  it('leaves the eleven Oceanian codes pending name review unchanged', () => {
    for (const code of ['CX', 'KI', 'MH', 'MP', 'NF', 'NU', 'PN', 'TK', 'TO', 'TV', 'WF']) {
      expect(fictionalAddress(listCities(code)[0], keys[0]).line1, code).toBeNull()
    }
  })
})
