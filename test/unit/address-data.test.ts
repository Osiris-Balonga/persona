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
    expect(cg.formatted).not.toContain('null')
    expect(fictionalAddress(getCity('IN', 'Mumbai')!, key).formatted).not.toContain('%')
    const japan = fictionalAddress(getCity('JP', 'Tokyo')!, key)
    expect(japan.formatted).toContain(japan.city)
    expect(japan.formatted).not.toContain('〒')
    const pitcairn = fictionalAddress(getCity('PN', 'Adamstown')!, key)
    expect(pitcairn).toMatchObject({ line1: 'Example Place', postalCode: 'PCRN 1ZZ' })
    expect(pitcairn.formatted).toContain('Adamstown\nPCRN 1ZZ')
  })
})
