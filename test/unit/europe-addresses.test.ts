import { describe, expect, it } from 'vitest'
import { fictionalAddress } from '../../src/geography/address-data.js'
import { listCities, getCity } from '../../src/geography/cities.js'
import { europeReviewedNames } from '../../src/geography/europe-reviewed-names.js'
import { europeGenderedNames } from '../../src/geography/europe-gendered-names.js'
import { europeIslandNames } from '../../src/geography/europe-island-names.js'

const europeanCodes = [
  ...Object.keys(europeReviewedNames),
  ...Object.keys(europeGenderedNames),
  ...Object.keys(europeIslandNames),
]
const keys = Array.from({ length: 24 }, (_, index) => index.toString(16).padStart(16, '0').repeat(4))

describe('plausible synthetic European street lines', () => {
  it('provides street lines for every sampled city in the 50 profile-enabled European codes', () => {
    expect(europeanCodes).toHaveLength(50)
    for (const code of europeanCodes) {
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

  it('varies European street names by seed and repeats them for the same seed', () => {
    for (const code of europeanCodes) {
      const city = listCities(code)[0]
      const labels = keys.map((key) => fictionalAddress(city, key).line1?.replace(/\b\d{1,3}\b/g, '').trim())
      expect(new Set(labels).size, code).toBeGreaterThanOrEqual(4)
      expect(fictionalAddress(city, keys[0]).line1).toBe(fictionalAddress(city, keys[0]).line1)
    }
  })

  it('uses local road vocabulary and the city region in multilingual countries', () => {
    const samples = [
      ['FR', 'Paris', /\b(?:Rue|Avenue|Boulevard)\b/],
      ['GB', 'London', /\b(?:Road|Street|Avenue)\b/],
      ['DE', 'Berlin', /(?:straße|weg|allee)\b/i],
      ['IT', 'Rome', /\b(?:Via|Viale|Piazza)\b/],
      ['PT', 'Lisbon', /\b(?:Rua|Avenida|Travessa)\b/],
      ['PL', 'Warsaw', /\bul\./],
      ['GR', 'Athens', /\b(?:Odos|Leoforos)\b/],
      ['BE', 'Antwerp', /(?:straat|laan)\b/i],
      ['BE', 'Liège', /\b(?:Rue|Avenue|Boulevard)\b/],
      ['CH', 'Zürich', /(?:strasse|weg|allee)\b/i],
      ['CH', 'Geneva', /\b(?:Rue|Avenue|Boulevard)\b/],
      ['CH', 'Lugano', /\b(?:Via|Viale|Piazza)\b/],
    ] as const
    for (const [country, name, pattern] of samples) {
      const city = getCity(country, name)
      expect(city, `${country}/${name}`).toBeDefined()
      expect(fictionalAddress(city!, keys[1]).line1, `${country}/${name}`).toMatch(pattern)
    }
  })

  it('keeps Svalbard and Vatican City pending until their profile data is available', () => {
    for (const code of ['SJ', 'VA']) {
      const city = listCities(code)[0]
      expect(fictionalAddress(city, keys[0]).line1).toBeNull()
    }
  })

  it('keeps name particles legible in Dutch and Liechtenstein street names', () => {
    for (const [code, forbidden] of [['NL', /\b(?:van|de)-/i], ['LI', /\bvon-/i]] as const) {
      const city = listCities(code)[0]
      for (const key of keys) {
        expect(fictionalAddress(city, key).line1, code).not.toMatch(forbidden)
      }
    }
  })

  it('uses genitive surname forms in Baltic street labels', () => {
    const key = '0123456789abcdef'.repeat(4)
    expect(fictionalAddress(getCity('EE', 'Tallinn')!, key).line1).toContain('Vaheri tänav')
    expect(fictionalAddress(getCity('LV', 'Riga')!, key).line1).toContain('Ozoliņa gatve')
    expect(fictionalAddress(getCity('LT', 'Vilnius')!, key).line1).toContain('Adomaičio alėja')
  })

  it('uses Finnish surname stems that combine coherently with road suffixes', () => {
    const helsinki = getCity('FI', 'Helsinki')!
    for (const key of keys) {
      expect(fictionalAddress(helsinki, key).line1).toMatch(/sen(?:katu|tie|kuja) \d+$/)
    }
  })
})
