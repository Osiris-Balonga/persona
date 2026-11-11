import { describe, expect, it } from 'vitest'
import { listCountries } from '../../src/geography/countries.js'
import { listCoverage } from '../../src/geography/coverage.js'
import { nameContextForCountry, selectName } from '../../src/geography/names.js'
import { hasReviewedNamePool } from '../../src/geography/profile-availability.js'
import { resolveNameProvider, reviewedNameCountryCodes } from '../../src/geography/name-providers.js'

describe('name provider registry', () => {
  it('resolves every country context and its reviewed coverage provenance consistently', () => {
    const coverage = listCoverage()
    for (const country of listCountries()) {
      const context = nameContextForCountry(country.code)
      const provider = resolveNameProvider(country.code)
      if (!context) {
        expect(provider).toBeUndefined()
        continue
      }
      expect(provider?.context).toEqual(context)
      expect(provider?.reviewed).toBe(hasReviewedNamePool(country.code))
      for (const pool of context.pools) expect(provider?.pools[pool.locale]).toBeDefined()
      if (country.generation === 'eligible') {
        const names = coverage.find(row => row.country === country.code)!.names
        expect(provider?.source).toBe(names.source)
        expect(provider?.supplementarySources).toEqual(names.supplementarySources)
      }
    }
    expect(reviewedNameCountryCodes().sort()).toEqual(listCountries().filter(country => hasReviewedNamePool(country.code)).map(country => country.code).sort())
    expect(resolveNameProvider('XX')).toBeUndefined()
  })

  it('preserves cultural strategies and seeded gendered components', () => {
    expect(resolveNameProvider('MM')?.pools.my_MM.strategy).toBe('full-name')
    expect(resolveNameProvider('ET')?.pools.et_ET.strategy).toBe('patronymic')
    const key = '0'.repeat(64)
    expect(selectName('MM', 'female', key).fullName).toBe('Aye Aye Myint')
    expect(selectName('BT', 'female', key).fullName).toBe('Karma Chöden')
    expect(selectName('ET', 'female', key).fullName).toBe('Abeba Abebe')
    expect(selectName('ET', 'male', key).firstName).not.toBe(selectName('ET', 'male', key).lastName)
    expect(selectName('PL', 'female', key).lastName).toBe('Kowalska')
    expect(selectName('KZ', 'female', key).lastName).toBe('Nazarbayeva')
  })
})
