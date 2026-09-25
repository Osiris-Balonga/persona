import { describe, expect, it } from 'vitest'
import { fictionalEmail, fictionalPhone } from '../../src/geography/fictional-contact.js'
import { listCities } from '../../src/geography/cities.js'

const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('fictional contact values', () => {
  it('uses the reserved example domain and a stable disambiguator', () => {
    expect(fictionalEmail('Élodie', 'N’Diaye', key)).toBe('elodie.ndiaye.0123456789ab@example.test')
    expect(fictionalEmail('Élodie', 'N’Diaye', key)).toBe(fictionalEmail('Élodie', 'N’Diaye', key))
  })

  it('builds a stable address from the two displayed components of a Burmese name', () => {
    expect(fictionalEmail('Aye Aye', 'Myint', key)).toBe('ayeaye.myint.0123456789ab@example.test')
  })

  it('uses only vetted non-working number ranges and otherwise returns null', () => {
    expect(fictionalPhone('US', 'Washington', key)).toMatch(/^\+120255501\d{2}$/)
    expect(fictionalPhone('GB', 'London', key)).toMatch(/^\+447700900\d{3}$/)
    expect(fictionalPhone('CG', 'Brazzaville', key)).toBeNull()
    expect(fictionalPhone('PN', 'Adamstown', key)).toBeNull()
  })

  it('uses regulator-reserved Australian geographic ranges matching the sampled city', () => {
    for (const [city, area] of [
      ['Sydney', '2'], ['Canberra', '2'], ['Melbourne', '3'],
      ['Brisbane', '7'], ['Perth', '8'], ['Adelaide', '8'],
    ] as const) {
      expect(fictionalPhone('AU', city, key)).toMatch(new RegExp(`^\\+61${area}5550\\d{4}$`))
    }
    expect(fictionalPhone('AU', 'Unknown city', key)).toBeNull()
  })

  it('uses the Canadian reserved 555-0100–0199 range with local area codes', () => {
    for (const [city, area] of [
      ['Toronto', '416'], ['Montréal', '514'], ['Calgary', '403'], ['Ottawa', '613'],
      ['Edmonton', '780'], ['Winnipeg', '204'], ['Mississauga', '905'],
      ['Vancouver', '604'], ['Brampton', '905'], ['Hamilton', '905'],
      ['Surrey', '604'], ['Québec', '418'],
    ] as const) {
      expect(fictionalPhone('CA', city, key)).toMatch(new RegExp(`^\\+1${area}55501\\d{2}$`))
    }
    expect(fictionalPhone('CA', 'Unknown city', key)).toBeNull()
  })

  it('uses a matching US area code inside the reserved 555 range for each sampled city', () => {
    for (const [city, area] of [
      ['New York City', '212'], ['Los Angeles', '213'], ['Brooklyn', '718'],
      ['Chicago', '312'], ['Queens', '718'], ['Houston', '713'], ['Phoenix', '602'],
      ['Philadelphia', '215'], ['San Antonio', '210'], ['Manhattan', '212'],
      ['San Diego', '619'], ['The Bronx', '718'], ['Washington', '202'],
    ] as const) {
      expect(fictionalPhone('US', city, key)).toMatch(new RegExp(`^\\+1${area}55501\\d{2}$`))
    }
    expect(fictionalPhone('US', 'Unknown city', key)).toBeNull()
  })

  it('covers every sampled city in the four documented phone countries', () => {
    for (const country of ['US', 'CA', 'AU', 'GB']) {
      expect(listCities(country).every((city) => fictionalPhone(country, city.name, key) !== null), country).toBe(true)
    }
  })
})
