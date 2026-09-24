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
    expect(nameContextForCountry('SN')).toMatchObject({ fallback: 'local', pools: [{ locale: 'sn_SN' }] })
    expect(nameContextForCountry('CG')).toMatchObject({ fallback: 'local', pools: [{ locale: 'cg_CG' }] })
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

  it('uses a small local Malawian pool instead of the global English fallback', () => {
    expect(nameContextForCountry('MW')).toMatchObject({ fallback: 'local', pools: [{ locale: 'mw_MW', tier: 'local' }] })
    for (const gender of ['female', 'male'] as const) {
      const name = selectName('MW', gender, key)
      expect(['Chikondi', 'Chimwemwe', 'Mtendere', 'Ufulu', 'Mphatso']).toContain(name.firstName)
      expect(['Banda', 'Phiri', 'Nkhoma', 'Chisale']).toContain(name.lastName)
      expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
    }
  })

  it('uses Ethiopian given names and a paternal given-name component', () => {
    expect(nameContextForCountry('ET')).toMatchObject({ fallback: 'local', pools: [{ locale: 'et_ET', tier: 'local' }] })
    for (const gender of ['female', 'male'] as const) {
      const name = selectName('ET', gender, key)
      expect(gender === 'female'
        ? ['Abeba', 'Almaz', 'Birtukan', 'Tigist', 'Tseday']
        : ['Abebe', 'Bekele', 'Tesfaye', 'Aklilu', 'Dawit']).toContain(name.firstName)
      expect(['Abebe', 'Bekele', 'Tesfaye', 'Aklilu', 'Dawit']).toContain(name.lastName)
      expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
    }
    const zeroKey = '0'.repeat(64)
    const male = selectName('ET', 'male', zeroKey)
    expect(male.firstName).not.toBe(male.lastName)
  })

  it('uses reviewed local samples for Congo, Ghana, and Senegal', () => {
    const samples = {
      CG: { female: ['Pascaline', 'Simone', 'Hortense', 'Charlotte', 'Jeanne'],
        male: ['Daniel', 'Théophile', 'Michel', 'Pascal', 'Guillaume'],
        family: ['Adoua', 'Mahinga', 'Okoula', 'Ngoto', 'Assassa', 'Banvidi'] },
      GH: { female: ['Akosua', 'Abena', 'Ama', 'Akua', 'Yaa'],
        male: ['Kofi', 'Kwame', 'Kwabena', 'Kwasi', 'Kwadwo'],
        family: ['Mensah', 'Asante', 'Osei', 'Boakye', 'Ofori', 'Asamoah'] },
      SN: { female: ['Aminata', 'Awa', 'Aïssatou', 'Fatou'],
        male: ['Abdoulaye', 'Cheikh', 'Ahmadou', 'Mamadou'],
        family: ['Wane', 'Diouf', 'Fall', 'Gueye', 'Ndiaye', 'Sy'] },
    } as const
    for (const [country, pool] of Object.entries(samples)) {
      expect(nameContextForCountry(country)).toMatchObject({ fallback: 'local', pools: [{ tier: 'local' }] })
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(country, gender, key)
        expect(pool[gender]).toContain(name.firstName)
        expect(pool.family).toContain(name.lastName)
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
  })

  it('uses the published South African male, female, and family name sample', () => {
    expect(nameContextForCountry('ZA')).toMatchObject({ fallback: 'local', pools: [{ locale: 'za_ZA', tier: 'local' }] })
    const female = selectName('ZA', 'female', key)
    const male = selectName('ZA', 'male', key)
    expect(['Onalerona', 'Zanokuhle', 'Melokuhle', 'Lisakhanya', 'Lethabo', 'Nkanyezi', 'Lesedi', 'Omphile', 'Olwemihla'])
      .toContain(female.firstName)
    expect(['Lethabo', 'Lubanzi', 'Nkazimulo', 'Nkanyezi', 'Langelihle', 'Lesedi', 'Lethokuhle', 'Siphosethu', 'Leano'])
      .toContain(male.firstName)
    for (const name of [female, male]) {
      expect(['Dlamini', 'Ndlovu', 'Nkosi', 'Khumalo', 'Sithole', 'Mkhize', 'Mokoena', 'Mthembu', 'Gumede', 'Ngcobo'])
        .toContain(name.lastName)
      expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
    }
  })

  it('keeps Rwandan and Ugandan given and second name components local', () => {
    const samples = {
      RW: { female: ['Aline', 'Judith', 'Jeanne', 'Emma'],
        male: ['Anastase', 'Théogène', 'Venuste', 'Jean Claude'],
        family: ['Ineza', 'Uwase', 'Ishimwe', 'Irakoze', 'Iganze', 'Mugisha', 'Hirwa', 'Igiraneza'] },
      UG: { female: ['Jesca', 'Susan', 'Lillian', 'Dorcus', 'Jane', 'Judith', 'Agnes', 'Hellen'],
        male: ['Cuthbert', 'Julius', 'Francis', 'Patrick', 'Ronald'],
        family: ['Ababiku', 'Abeja', 'Aber', 'Abigaba', 'Acen', 'Acon', 'Adome', 'Aeku', 'Afidra'] },
    } as const
    for (const [country, pool] of Object.entries(samples)) {
      expect(nameContextForCountry(country)).toMatchObject({ fallback: 'local', pools: [{ tier: 'local' }] })
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(country, gender, key)
        expect(pool[gender]).toContain(name.firstName)
        expect(pool.family).toContain(name.lastName)
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
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
