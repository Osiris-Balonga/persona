import { describe, expect, it } from 'vitest'
import { nameContextForCountry, selectName } from '../../src/geography/names.js'
import { namePoolData } from '../../src/geography/name-pool-data.js'
import { listCountries } from '../../src/geography/countries.js'
import { myanmarGivenNames } from '../../src/geography/surname-free-names.js'
import { africaReviewedNames } from '../../src/geography/africa-reviewed-names.js'

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

  it('uses the reviewed local sample for Congo', () => {
    const samples = {
      CG: { female: ['Pascaline', 'Simone', 'Hortense', 'Charlotte', 'Jeanne'],
        male: ['Daniel', 'Théophile', 'Michel', 'Pascal', 'Guillaume'],
        family: ['Adoua', 'Mahinga', 'Okoula', 'Ngoto', 'Assassa', 'Banvidi'] },
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

  it('keeps the Ghana and Senegal name pools broad, distinct, and two-field compatible', () => {
    for (const country of ['GH', 'SN']) {
      const pool = africaReviewedNames[country]
      for (const field of ['female', 'male', 'family'] as const) {
        expect(pool[field].length).toBeGreaterThanOrEqual(50)
        expect(new Set(pool[field]).size).toBe(pool[field].length)
      }
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(country, gender, key)
        expect(pool[gender]).toContain(name.firstName)
        expect(pool.family).toContain(name.lastName)
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
    expect(africaReviewedNames.GH.female).toContain('Akosua')
    expect(africaReviewedNames.GH.male).toContain('Kofi')
    expect(africaReviewedNames.SN.female).toContain('Aïssatou')
    expect(africaReviewedNames.SN.male).toContain('Cheikh')
  })

  it('provides broad local, two-field pools for the reviewed Africa batches', () => {
    const pools = africaReviewedNames as unknown as Record<string, {
      female: readonly string[]; male: readonly string[]; family: readonly string[]
    }>
    for (const country of ['AO', 'BF', 'BI', 'BJ', 'CD', 'CF', 'CI', 'CM', 'CV', 'DZ', 'EG', 'GA', 'GM', 'GN', 'GQ', 'LR', 'MA', 'MG', 'ML', 'MU', 'MZ', 'NG', 'RW', 'SD', 'SL', 'SO', 'SS', 'TG', 'TN']) {
      expect(nameContextForCountry(country)).toMatchObject({ fallback: 'local' })
      const pool = pools[country]
      expect(pool).toBeDefined()
      for (const field of ['female', 'male', 'family'] as const) {
        expect(pool[field].length).toBeGreaterThanOrEqual(50)
        expect(new Set(pool[field]).size).toBe(pool[field].length)
      }
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(country, gender, key)
        expect(pool[gender]).toContain(name.firstName)
        expect(pool.family).toContain(name.lastName)
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
  })

  it('uses departmental civil-registration names for La Réunion', () => {
    const pool = (africaReviewedNames as unknown as Record<string, {
      female: readonly string[]; male: readonly string[]; family: readonly string[]
    }>).RE
    expect(nameContextForCountry('RE')).toMatchObject({ fallback: 'local' })
    expect(pool.female).toHaveLength(50)
    expect(pool.male).toHaveLength(50)
    expect(pool.family).toHaveLength(100)
    expect(pool.female).toContain('Marie')
    expect(pool.male).toContain('Lucas')
    expect(pool.family).toContain('Payet')
    for (const gender of ['female', 'male'] as const) {
      const name = selectName('RE', gender, key)
      expect(pool[gender]).toContain(name.firstName)
      expect(pool.family).toContain(name.lastName)
    }
  })

  it('broadens the existing East and Southern Africa pools while preserving local examples', () => {
    const pools = africaReviewedNames as unknown as Record<string, {
      female: readonly string[]; male: readonly string[]; family: readonly string[]
    }>
    for (const country of ['KE', 'TZ', 'UG', 'ZM', 'ZW']) {
      const pool = pools[country]
      for (const field of ['female', 'male', 'family'] as const) {
        expect(pool[field].length).toBeGreaterThanOrEqual(50)
        expect(new Set(pool[field]).size).toBe(pool[field].length)
      }
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(country, gender, key)
        expect(pool[gender]).toContain(name.firstName)
        expect(pool.family).toContain(name.lastName)
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
    expect(pools.KE.family).toContain('Odinga')
    expect(pools.TZ.female).toContain('Ashatu')
    expect(pools.UG.female).toContain('Jesca')
    expect(pools.ZM.family).toContain('Banda')
    expect(pools.ZW.female).toContain('Chido')
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

  it('uses reviewed Namibian name components', () => {
    const samples = {
      NA: { female: ['Saara', 'Emma', 'Alexia', 'Lucia', 'Hilma', 'Selma'],
        male: ['Phillipus', 'Paulus', 'Immanuel', 'Veikko', 'Salomon', 'Willem'],
        family: ['Kuugongelwa-Amadhila', 'Kantema', 'Manombe-Ncube', 'Iipumbu', 'Iita', 'Nekundi', 'Katamelo'] },
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

  it('uses reviewed Botswana, Lesotho, and Seychelles name components', () => {
    const samples = {
      BW: { female: ['Unity', 'Beauty', 'Talita', 'Phildah', 'Peggy', 'Annah'],
        male: ['Duma', 'Dithapelo', 'Dumelang', 'Wynter', 'Polson', 'Mokwaledi'],
        family: ['Dow', 'Manake', 'Monnakgotla', 'Keorapetse', 'Saleshando', 'Mmolotsi', 'Kedikilwe'] },
      LS: { female: ['Matumelo', 'Mamoipone', 'Likeleli', 'Mathato', 'Manthabiseng'],
        male: ['Tello', 'Thabo', 'Motlatsi', 'Moshoeshoe', 'Tseliso'],
        family: ['Sekatle', 'Senauoane', 'Monare', 'Phafoli', 'Phohleli', 'Kibane', 'Maqelepo', 'Fako'] },
      SC: { female: ['Audrey', 'Denise', 'Azarel', 'Sandra', 'Sylvanne', 'Valdana'],
        male: ['Egbert', 'Bernard', 'Alvin', 'Andy', 'Churchill', 'Trevor'],
        family: ['Vidot', 'Clarisse', 'Ernesta', 'Sultan', 'Lemiel', 'Georges', 'Labonte', 'Gill'] },
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
