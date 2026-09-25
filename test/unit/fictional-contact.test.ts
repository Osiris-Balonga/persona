import { describe, expect, it } from 'vitest'
import { fictionalEmail, fictionalPhone, nanpTerritoryAreas } from '../../src/geography/fictional-contact.js'
import { listCities } from '../../src/geography/cities.js'
import { listCountries } from '../../src/geography/countries.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'
import { mobilePhoneExamples } from '../../src/geography/phone-example-data.js'

const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('fictional contact values', () => {
  it('uses the reserved example domain and a stable disambiguator', () => {
    expect(fictionalEmail('Élodie', 'N’Diaye', key)).toBe('elodie.ndiaye.0123456789ab@example.test')
    expect(fictionalEmail('Élodie', 'N’Diaye', key)).toBe(fictionalEmail('Élodie', 'N’Diaye', key))
  })

  it('builds a stable address from the two displayed components of a Burmese name', () => {
    expect(fictionalEmail('Aye Aye', 'Myint', key)).toBe('ayeaye.myint.0123456789ab@example.test')
  })

  it('keeps reserved ranges and generates local-format numbers elsewhere', () => {
    expect(fictionalPhone('US', 'Washington', key)).toMatch(/^\+120255501\d{2}$/)
    expect(fictionalPhone('GB', 'London', key)).toMatch(/^\+447700900\d{3}$/)
    expect(fictionalPhone('CG', 'Brazzaville', key)).toMatch(/^\+24206\d{7}$/)
    expect(fictionalPhone('CG', 'Brazzaville', key, 'zero')).toBe('+242060000000')
    expect(fictionalPhone('US', 'Washington', key, 'zero')).toBe(fictionalPhone('US', 'Washington', key))
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

  it('uses the NANP reserved 555 block with each territory’s assigned area code', () => {
    for (const [country, city, area] of [
      ['AG', 'Saint John’s', '268'], ['AI', 'The Valley', '264'], ['AS', 'Pago Pago', '684'],
      ['BB', 'Bridgetown', '246'], ['BM', 'Pembroke Parish', '441'], ['BS', 'Nassau', '242'],
      ['DM', 'Roseau', '767'], ['DO', 'Santo Domingo', '809'], ['GD', "Saint George's", '473'],
      ['GU', 'Dededo Village', '671'], ['JM', 'Kingston', '876'], ['KN', 'Basseterre', '869'],
      ['KY', 'George Town', '345'], ['LC', 'Castries', '758'], ['MP', 'Saipan', '670'],
      ['MS', 'Brades', '664'], ['PR', 'San Juan', '787'], ['SX', 'Cul de Sac', '721'],
      ['TC', 'Providenciales', '649'], ['TT', 'Chaguanas', '868'], ['VC', 'Kingstown', '784'],
      ['VG', 'Road Town', '284'], ['VI', 'Charlotte Amalie', '340'],
    ] as const) {
      expect(fictionalPhone(country, city, key)).toMatch(new RegExp(`^\\+1${area}55501\\d{2}$`))
      expect(fictionalPhone(country, 'Unknown city', key)).toBeNull()
      expect(listCities(country).every((sampled) => fictionalPhone(country, sampled.name, key) !== null), country).toBe(true)
    }
  })

  it('uses only the reserved national mobile ranges in France, Germany, Ireland and Sweden', () => {
    expect(fictionalPhone('FR', 'Paris', key)).toMatch(/^\+3363998\d{4}$/)
    expect(fictionalPhone('DE', 'Berlin', key)).toMatch(/^\+4917139200\d{2}$/)
    expect(fictionalPhone('IE', 'Dublin', key)).toMatch(/^\+353890110\d{3}$/)
    expect(fictionalPhone('SE', 'Stockholm', key)).toMatch(/^\+467017406(?:0[5-9]|[1-9]\d)$/)
    for (const country of ['FR', 'DE', 'IE', 'SE']) {
      expect(fictionalPhone(country, 'Unknown city', key)).toBeNull()
      expect(listCities(country).every((sampled) => fictionalPhone(country, sampled.name, key) !== null), country).toBe(true)
    }
  })

  it('uses Norway’s blocked TV and film range for every sampled Norwegian city', () => {
    expect(fictionalPhone('NO', 'Oslo', key)).toMatch(/^\+476805\d{4}$/)
    expect(fictionalPhone('NO', 'Unknown city', key)).toBeNull()
    expect(listCities('NO').every((city) => fictionalPhone('NO', city.name, key) !== null)).toBe(true)
  })

  it('covers every profile country with an E.164-sized local example', () => {
    for (const country of listCountries().filter(canGenerateProfile)) {
      const city = listCities(country.code)[0]
      const number = fictionalPhone(country.code, city.name, key)
      expect(number, country.code).toMatch(/^\+[1-9]\d{1,14}$/)
      expect(number?.startsWith(country.callingCode ?? '!'), country.code).toBe(true)
      if (!['US', 'CA', 'GB', 'AU', 'FR', 'DE', 'IE', 'SE', 'NO'].includes(country.code) && !nanpTerritoryAreas[country.code]) {
        expect(number?.slice(country.callingCode?.length), country.code).toHaveLength(mobilePhoneExamples[country.code].length)
      }
    }
  })
})
