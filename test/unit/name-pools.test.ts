import { describe, expect, it } from 'vitest'
import { nameContextForCountry, selectName } from '../../src/geography/names.js'
import { listCountries } from '../../src/geography/countries.js'

const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('cultural name pools', () => {
  it('has an explicit local, language, or global path for each resident-eligible code', () => {
    for (const country of listCountries().filter((entry) => entry.generation === 'eligible')) {
      const context = nameContextForCountry(country.code)
      expect(context.pools.length).toBeGreaterThan(0)
      expect(context.fallback).toMatch(/^(local|language|global)$/)
    }
    expect(nameContextForCountry('SN')).toMatchObject({ fallback: 'local', pools: expect.arrayContaining([expect.objectContaining({ locale: 'fr_SN' })]) })
    expect(nameContextForCountry('CG')).toMatchObject({ fallback: 'language', pools: expect.arrayContaining([expect.objectContaining({ locale: 'fr' })]) })
    expect(nameContextForCountry('PN')).toMatchObject({ fallback: 'language' })
    expect(nameContextForCountry('NG')).toMatchObject({ fallback: 'local' })
  })

  it('selects a seeded name without an appearance or portrait input', () => {
    const one = selectName('SN', 'female', key)
    expect(one).toEqual(selectName('SN', 'female', key))
    expect(one.firstName.length).toBeGreaterThan(0)
    expect(one.lastName.length).toBeGreaterThan(0)
    expect(one.locale).toBeTruthy()
  })

  it('uses country-specific pools without unreviewed secondary-language pools', () => {
    expect(nameContextForCountry('BR').pools.map((pool) => pool.locale)).toEqual(['pt_BR'])
    expect(nameContextForCountry('BE').pools.map((pool) => pool.locale)).toEqual(['nl_BE', 'fr_BE'])
  })
})
