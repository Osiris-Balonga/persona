import { describe, expect, it } from 'vitest'
import { ageOn } from '../../src/age.js'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { generatePersonWithoutPortrait, resolveAbstractPerson } from '../../src/generation-core.js'
import { appearanceCategories } from '../../src/geography/appearance.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { createGenerationContext } from '../../src/replay.js'

const versions = { dataVersion: 'geo-v1', catalogVersion: 'empty-v1' }
const parse = (query: string) => parsePeopleQuery(new URLSearchParams(query))
const person = (raw: string, index = 0) => {
  const query = parse(raw)
  return generatePersonWithoutPortrait(query, createGenerationContext(query, versions), index)
}
const fixedAgeContext = (offset: number): ReturnType<typeof createGenerationContext> => ({
  componentKey(_index, component) {
    return component === 'age'
      ? `${offset.toString(16).padStart(12, '0')}${'0'.repeat(52)}`
      : '0'.repeat(64)
  },
})

describe('generation core', () => {
  it('resolves explicit constraints before selecting details', () => {
    const query = parse('nationality=FR&residenceCountry=MW&city=Lilongwe&gender=female&ageGroup=teen&seed=school-demo&asOf=2026-09-24')
    const resolved = resolveAbstractPerson(query, createGenerationContext(query, versions), 0)
    expect(resolved).toMatchObject({
      nationality: { code: 'FR' }, residenceCountry: { code: 'MW' },
      city: { name: 'Lilongwe', country: 'MW' }, gender: 'female', ageGroup: 'teen',
      nameContext: { fallback: 'local' },
    })
    expect(resolved.age).toBeGreaterThanOrEqual(13)
    expect(resolved.age).toBeLessThanOrEqual(17)
    expect(appearanceCategories).toContain(resolved.appearance)
  })

  it('keeps exact ages, derived groups, birth dates, and contacts coherent', () => {
    for (const [age, group, offset] of [[6, 'child', 0], [14, 'teen', 1], [65, 'senior', 0], [100, 'senior', 35]] as const) {
      const query = parse(`nationality=MW&ageGroup=${group}&seed=age-demo&asOf=2025-02-28`)
      const result = generatePersonWithoutPortrait(query, fixedAgeContext(offset), 0)
      expect(result.age).toBe(age)
      expect(ageOn(result.dateOfBirth, '2025-02-28')).toBe(age)
      expect(result.ageGroup).toBe(group)
      expect(result.fullName).toBe(`${result.firstName} ${result.lastName}`)
      expect(result.email).toMatch(/@example\.test$/)
      expect(parsePhoneNumberFromString(result.phone ?? '')?.country).toBe('MW')
      expect(result.address.country).toBe('MW')
      expect(result.address.city).toBe(result.city)
      expect(result.locationCity.name).toBe(result.city)
      expect(result).not.toHaveProperty('picture')
    }
  })

  it('honors an age group without a precise age and preserves seeded choices across count and fields', () => {
    const base = 'nationality=GB&ageGroup=teen&seed=group-demo&asOf=2026-09-24'
    const first = person(`${base}&count=1`)
    expect(first.age).toBeGreaterThanOrEqual(13)
    expect(first.age).toBeLessThanOrEqual(17)
    expect(person(`${base}&count=20&fields=name.first,location.city`, 0)).toEqual(first)
    expect(person(`${base}&count=20`, 1)).toEqual(person(`${base}&count=2`, 1))
    expect(person(`${base}&count=20`, 1).id).not.toBe(first.id)
  })

  it('uses a verified fictional phone range when one exists', () => {
    const result = person('nationality=US&city=Washington&gender=male&seed=contact-demo&asOf=2026-09-24')
    expect(result.phone).toMatch(/^\+120255501\d{2}$/)
    expect(result.address.city).toBe('Washington')
  })
})
