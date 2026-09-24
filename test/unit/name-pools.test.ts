import { describe, expect, it } from 'vitest'
import { nameContextForCountry, selectName } from '../../src/geography/names.js'
import { namePoolData } from '../../src/geography/name-pool-data.js'
import { listCountries } from '../../src/geography/countries.js'
import { myanmarGivenNames } from '../../src/geography/surname-free-names.js'

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

  it('keeps the Georgian local given-name pools distinct by gender', () => {
    expect(namePoolData.ka_GE.female).toContain('ნინო')
    expect(namePoolData.ka_GE.male).toContain('გიორგი')
    expect(namePoolData.ka_GE.female).not.toContain('გიორგი')
    expect(namePoolData.ka_GE.male).not.toContain('ნინო')
  })

  it('exposes Burmese and Indonesian name components without changing the complete name', () => {
    for (const country of ['MM', 'ID']) {
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(country, gender, key)
        expect(name).toEqual(selectName(country, gender, key))
        expect(name.firstName).toBeTruthy()
        expect(name.lastName).toBeTruthy()
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
    expect(nameContextForCountry('MM').fallback).toBe('local')
    expect([...myanmarGivenNames.female, ...myanmarGivenNames.male].every((name) => name.includes(' '))).toBe(true)
  })

  it('uses Andorran civil-registry given names with an explicit family-name fallback', () => {
    expect(nameContextForCountry('AD').fallback).toBe('local')
    const female = selectName('AD', 'female', key)
    const male = selectName('AD', 'male', key)
    expect(['Laia', 'Carlota', 'Emma', 'Martina', 'Aina', 'Laura']).toContain(female.firstName)
    expect(['Marc', 'Eric', 'Jan', 'Daniel', 'Jordi', 'Martí']).toContain(male.firstName)
    expect(female.lastName).toBeTruthy()
    expect(male.fullName).toBe(`${male.firstName} ${male.lastName}`)
  })

  it('exposes Bhutanese two-part given names as two display components', () => {
    expect(nameContextForCountry('BT').fallback).toBe('local')
    for (const gender of ['female', 'male'] as const) {
      const name = selectName('BT', gender, key)
      expect(name).toEqual(selectName('BT', gender, key))
      expect(name.firstName).toBeTruthy()
      expect(name.lastName).toBeTruthy()
      expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      expect(gender === 'female' ? ['Chöden', 'Wangmo', 'Zangmo'] : ['Dorjé', 'Wangyal', 'Jamtsho'])
        .toContain(name.lastName)
    }
  })
})
