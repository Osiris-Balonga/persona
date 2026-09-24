import { describe, expect, it } from 'vitest'
import { addressRule, fictionalAddress, postalCodeForCity } from '../../src/geography/address-data.js'
import { getCity } from '../../src/geography/cities.js'
import { listCountries } from '../../src/geography/countries.js'

describe('country address metadata and city-linked postcodes', () => {
  it('records a format rule for each assigned code and makes generic fallbacks explicit', () => {
    expect(listCountries().every((country) => addressRule(country.code) !== undefined)).toBe(true)
    expect(addressRule('US')).toMatchObject({ format: '%N%n%O%n%A%n%C, %S %Z', required: 'ACSZ', fallback: false })
    expect(addressRule('CG')).toMatchObject({ fallback: true })
  })

  it('uses only a postcode linked to the sampled city and its vicinity', () => {
    const washington = getCity('US', 'Washington')!
    const paris = getCity('FR', 'Paris')!
    expect(postalCodeForCity(washington)).toMatch(/^\d{5}$/)
    expect(postalCodeForCity(paris)).toMatch(/^75\d{3}$/)
    expect(postalCodeForCity(getCity('CG', 'Brazzaville')!)).toBeNull()
  })

  it('keeps address components and country order coherent without inventing a postcode', () => {
    const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const us = fictionalAddress(getCity('US', 'Washington')!, key)
    expect(us).toMatchObject({ city: 'Washington', region: 'District of Columbia', country: 'US' })
    expect(us.formatted).toContain(`Washington, District of Columbia ${us.postalCode}`)
    const cg = fictionalAddress(getCity('CG', 'Brazzaville')!, key)
    expect(cg).toMatchObject({ city: 'Brazzaville', postalCode: null, country: 'CG' })
    expect(cg.line1).toContain("rue de l'Exemple")
    expect(fictionalAddress(getCity('SN', 'Dakar')!, key).line1).toContain("rue de l'Exemple")
    expect(cg.formatted).not.toContain('null')
    const mozambique = fictionalAddress(getCity('MZ', 'Maputo')!, key)
    expect(mozambique).toMatchObject({ city: 'Maputo', region: 'Maputo City', postalCode: null })
    expect(mozambique.formatted).toContain('Maputo, Maputo City')
    expect(fictionalAddress(getCity('IN', 'Mumbai')!, key).formatted).not.toContain('%')
    const japan = fictionalAddress(getCity('JP', 'Tokyo')!, key)
    expect(japan.formatted).toContain(japan.city)
    expect(japan.formatted).not.toContain('〒')
    const pitcairn = fictionalAddress(getCity('PN', 'Adamstown')!, key)
    expect(pitcairn).toMatchObject({ line1: 'Example Place', postalCode: 'PCRN 1ZZ' })
    expect(pitcairn.formatted).toContain('Adamstown\nPCRN 1ZZ')
  })

  it('omits country postcode prefixes when a city has no verified postcode', () => {
    const key = '0123456789abcdef'.repeat(4)
    for (const [country, city, prefix] of [
      ['HR', 'Zagreb', 'HR-'], ['LU', 'Luxembourg', 'L-'], ['MD', 'Chisinau', 'MD-'],
    ] as const) {
      const address = fictionalAddress(getCity(country, city)!, key)
      expect(address.postalCode).toBeNull()
      expect(address.formatted).toContain(city)
      expect(address.formatted).not.toContain(prefix)
    }
    const lahore = fictionalAddress(getCity('PK', 'Lahore')!, key)
    expect(lahore.postalCode).toBeNull()
    expect(lahore.formatted).toContain('Lahore')
    expect(lahore.formatted).not.toContain('Lahore-')
    const baku = fictionalAddress(getCity('AZ', 'Baku')!, key)
    expect(baku.postalCode).toBeNull()
    expect(baku.formatted).toContain('Baku')
    expect(baku.formatted).not.toContain('AZ Baku')
  })

  it('removes dangling address separators when optional locality parts are absent', () => {
    const key = '0123456789abcdef'.repeat(4)
    const dhaka = fictionalAddress(getCity('BD', 'Dhaka')!, key)
    const quezon = fictionalAddress(getCity('PH', 'Quezon City')!, key)
    expect(dhaka.postalCode).toBeNull()
    expect(dhaka.formatted).toContain('Dhaka')
    expect(dhaka.formatted).not.toContain('Dhaka -')
    expect(quezon.formatted).toContain('Quezon City')
    expect(quezon.formatted).not.toContain('\n,')
  })

  it('avoids repeating a city when the country format already prints its matching region', () => {
    const dubai = fictionalAddress(getCity('AE', 'Dubai')!, '0123456789abcdef'.repeat(4))
    expect(dubai.city).toBe('Dubai')
    expect(dubai.region).toBe('Dubai')
    expect(dubai.formatted).toBe('132 Example Street\nDubai')
    for (const code of ['CN', 'KP', 'KR'] as const) {
      const address = fictionalAddress(getCity(code, { CN: 'Shanghai', KP: 'Pyongyang', KR: 'Seoul' }[code])!, '0123456789abcdef'.repeat(4))
      expect(address.formatted.split(address.city)).toHaveLength(2)
    }
    const taipei = fictionalAddress(getCity('TW', 'Taipei')!, '0123456789abcdef'.repeat(4))
    expect(taipei.formatted).toContain('Taiwan, Taipei')
    const hcmc = fictionalAddress(getCity('VN', 'Ho Chi Minh City')!, '0123456789abcdef'.repeat(4))
    expect(hcmc.formatted.split(hcmc.city)).toHaveLength(2)
  })
})
