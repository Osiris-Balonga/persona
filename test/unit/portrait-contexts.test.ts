import { describe, expect, it } from 'vitest'
import { validatePortraitCatalog, type PortraitAsset } from '../../src/portraits/catalog.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'
import { selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { generatePeopleResponse } from '../../src/generate-people.js'
import { responseETag } from '../../src/replay.js'
import { ageGroupForAge, ageOn } from '../../src/age.js'

const key = '0'.repeat(64)
const parse = (query: string) => parsePeopleQuery(new URLSearchParams(query))
const base = { ...portraitCatalog.assets.find(asset => asset.collection === 'africa-central' && asset.gender === 'female')!,
  apparentAgeRanges: [[28, 32]], ageGroup: 'adult' as const }
const catalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [base] }

describe('portrait contexts', () => {
  it('rejects an explicit null context instead of treating it as absent', () => {
    const asset = { ...base, portraitContext: null } as unknown as PortraitAsset
    expect(validatePortraitCatalog({ ...catalog, assets: [asset] })).toContain(`Invalid portrait context ${base.id}`)
  })
  it('rejects unknown contexts and editorially incompatible portrait ages', () => {
    const unknown = { ...base, portraitContext: 'surgeon' } as PortraitAsset
    const childDoctor = { ...base, portraitContext: 'doctor', ageGroup: 'child', apparentAgeRanges: [[6, 8]] } as PortraitAsset
    expect(validatePortraitCatalog({ ...catalog, assets: [unknown] })).toContain(`Invalid portrait context ${base.id}`)
    expect(validatePortraitCatalog({ ...catalog, assets: [childDoctor] })).toContain(`Portrait age ranges do not match context ${base.id}`)
  })

  it('classifies every existing portrait as standard without losing catalogue approval', () => {
    expect(portraitCatalog.assets).toHaveLength(1764)
    expect(portraitCatalog.assets.every(asset => asset.portraitContext === 'standard')).toBe(true)
    expect(validatePortraitCatalog(portraitCatalog)).toEqual([])
  })

  it('selects within the requested context only and retains nonrepetition', () => {
    const doctors = [1, 2].map((n) => ({ ...base, id: `p_900${n}`, objectKey: `portraits/v1/large/p_900${n}.webp`,
      sha256: `${'b'.repeat(63)}${n}`, variants: undefined, portraitContext: 'doctor' as const }))
    const mixed = { ...catalog, assets: [base, ...doctors] }
    const profile = { age: 30, ageGroup: 'adult' as const, gender: 'female' as const }
    const used = new Set<string>()
    const first = selectPortraitFromCollection(mixed, profile, 'CG', key, used, 'doctor')
    const second = selectPortraitFromCollection(mixed, profile, 'CG', key, used, 'doctor')
    expect(first?.url).toContain('p_9001')
    expect(second?.url).toContain('p_9002')
    expect(selectPortraitFromCollection(mixed, profile, 'CG', key)?.url).toContain(base.id)
    expect(selectPortraitFromCollection(mixed, profile, 'CG', key, undefined, 'business')).toBeNull()
    expect(selectPortraitFromCollection(mixed, { ...profile, age: 24 }, 'CG', key, undefined, 'doctor')).toBeNull()
  })

  it('generates eligible ages with coherent birthdays while retaining unrelated identity', () => {
    const query = 'nationality=CG&gender=female&seed=context-pilot&asOf=2026-10-06&count=100'
    const standard = generatePeopleResponse(parse(query), catalog)
    const doctor = generatePeopleResponse(parse(`${query}&portraitContext=doctor`), catalog)
    expect(doctor.results.every(person => person.age >= 25 && person.picture === null)).toBe(true)
    expect(doctor.results.every(person => ageOn(person.dateOfBirth, doctor.meta.asOf) === person.age
      && ageGroupForAge(person.age) === person.ageGroup)).toBe(true)
    expect(doctor.results.map(({ id, fullName, country, email, phone }) => ({ id, fullName, country, email, phone })))
      .toEqual(standard.results.map(({ id, fullName, country, email, phone }) => ({ id, fullName, country, email, phone })))
    expect(generatePeopleResponse(parse(`${query}&portraitContext=school-pupil`), catalog).results.every(person => person.age <= 17)).toBe(true)
    expect(generatePeopleResponse(parse(`${query}&portraitContext=doctor&ageGroup=child,adult`), catalog).results.every(person => person.age >= 25 && person.age <= 64)).toBe(true)
    for (const context of ['construction', 'business', 'university-student']) {
      const response = generatePeopleResponse(parse(`${query}&portraitContext=${context}`), catalog)
      expect(response.results.every(person => person.age >= 18)).toBe(true)
    }
  })

  it('normalizes standard defaults and gives different contexts different validators', () => {
    const query = 'seed=context-pilot&asOf=2026-10-06'
    const versions = { dataVersion: 'geo-v1', catalogVersion: 'v1' }
    expect(responseETag(parse(query), versions)).toBe(responseETag(parse(`${query}&portraitContext=standard`), versions))
    expect(responseETag(parse(`${query}&portraitContext=doctor`), versions)).not.toBe(responseETag(parse(query), versions))
    expect(responseETag(parse(query), { ...versions, portraitSelectionVersion: 'contexts-v2' }))
      .not.toBe(responseETag(parse(query), versions))
    expect(() => parse('portraitContext=doctor&ageGroup=child,teen')).toThrow('ageGroup has no ages compatible with portraitContext')
    expect(() => parse('portraitContext=pilot')).toThrow('Unknown portraitContext')
    expect(() => parse('portraitContext=doctor&portraitContext=business')).toThrow('Unknown or repeated parameter')
  })
})
