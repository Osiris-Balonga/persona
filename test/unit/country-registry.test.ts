import { describe, expect, it } from 'vitest'
import { getCountry, listCountries, registryEdition } from '../../src/geography/countries.js'
import { parsePeopleQuery } from '../../src/people-query.js'

describe('versioned country and territory registry', () => {
  it('contains 249 unique assigned ISO 3166-1 codes, including territories', () => {
    const countries = listCountries()
    expect(registryEdition).toBe('2026-09-24')
    expect(countries).toHaveLength(249)
    expect(new Set(countries.map((country) => country.code)).size).toBe(249)
    expect(countries.every((country) => /^[A-Z]{2}$/.test(country.code) && country.name.length > 0)).toBe(true)
    expect(getCountry('CG')).toMatchObject({ name: 'Congo', alpha3: 'COG', numeric: '178', callingCode: '+242' })
    expect(getCountry('PR')).toMatchObject({ callingCode: '+1' })
    expect(getCountry('PN')).toMatchObject({ callingCode: null, generation: 'eligible' })
  })

  it('recognizes codes without permanent residents but does not generate resident profiles there', () => {
    for (const code of ['AQ', 'BV', 'GS', 'HM', 'IO', 'TF', 'UM']) {
      expect(getCountry(code)).toMatchObject({ generation: 'unavailable' })
      expect(() => parsePeopleQuery(new URLSearchParams(`country=${code}`))).toThrow(expect.objectContaining({
        code: 'UNSUPPORTED_VALUE', parameter: 'country', statusCode: 400,
      }))
    }
  })

  it('recognizes all codes but restricts beta profiles to reviewed local name pools', () => {
    expect(getCountry('XX')).toBeUndefined()
    expect(() => parsePeopleQuery(new URLSearchParams('country=XX'))).toThrow(expect.objectContaining({
      code: 'UNSUPPORTED_VALUE', parameter: 'country', statusCode: 400,
    }))
    for (const code of ['PN']) {
      expect(getCountry(code)?.generation).toBe('eligible')
      expect(() => parsePeopleQuery(new URLSearchParams(`country=${code}`))).toThrow(expect.objectContaining({
        code: 'UNSUPPORTED_VALUE', parameter: 'country', statusCode: 400,
      }))
    }
    for (const code of ['AO', 'BF', 'BJ', 'BT', 'BW', 'CD', 'CG', 'CI', 'CM', 'CV', 'DZ', 'EG', 'ET', 'GH', 'GM', 'GN', 'GQ', 'KE', 'LR', 'LS', 'MA', 'MG', 'ML', 'MM', 'MW', 'MZ', 'NA', 'NG', 'RW', 'SC', 'SL', 'SN', 'TG', 'TN', 'TZ', 'UG', 'ZA', 'ZM', 'ZW']) {
      expect(parsePeopleQuery(new URLSearchParams(`country=${code}`)).country).toBe(code)
    }
  })
})
