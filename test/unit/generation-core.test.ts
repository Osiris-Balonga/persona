import { describe, expect, it } from 'vitest'
import { ageOn } from '../../src/age.js'
import { generatePersonWithoutPortrait, resolveAbstractPerson } from '../../src/generation-core.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { createGenerationContext } from '../../src/replay.js'

const versions = { dataVersion: 'geo-v1', catalogVersion: 'empty-v1' }
const parse = (query: string) => parsePeopleQuery(new URLSearchParams(query))
const person = (raw: string, index = 0) => {
  const query = parse(raw)
  return generatePersonWithoutPortrait(query, createGenerationContext(query, versions), index)
}

describe('generation core', () => {
  it('resolves explicit constraints before selecting details', () => {
    const query = parse('country=MW&city=Lilongwe&gender=female&age=14&appearance=east-asian&seed=school-demo&asOf=2026-09-24')
    const resolved = resolveAbstractPerson(query, createGenerationContext(query, versions), 0)
    expect(resolved).toMatchObject({
      country: { code: 'MW' }, city: { name: 'Lilongwe', country: 'MW' },
      gender: 'female', age: 14, ageGroup: 'teen', appearance: 'east-asian',
      nameContext: { fallback: 'local' },
    })
  })

  it('keeps exact ages, derived groups, birth dates, and contacts coherent', () => {
    for (const age of [6, 14, 65, 100]) {
      const result = person(`country=MW&age=${age}&seed=age-demo&asOf=2025-02-28`)
      expect(result.age).toBe(age)
      expect(ageOn(result.dateOfBirth, '2025-02-28')).toBe(age)
      expect(result.ageGroup).toBe(age <= 12 ? 'child' : age <= 17 ? 'teen' : age < 65 ? 'adult' : 'senior')
      expect(result.fullName).toBe(`${result.firstName} ${result.lastName}`)
      expect(result.email).toMatch(/@example\.test$/)
      expect(result.phone).toBeNull()
      expect(result.address.country).toBe('MW')
      expect(result.address.city).toBe(result.city)
      expect(result).not.toHaveProperty('picture')
    }
  })

  it('honors an age group without a precise age and preserves seeded choices across count and fields', () => {
    const base = 'country=GB&ageGroup=teen&seed=group-demo&asOf=2026-09-24'
    const first = person(`${base}&count=1`)
    expect(first.age).toBeGreaterThanOrEqual(13)
    expect(first.age).toBeLessThanOrEqual(17)
    expect(person(`${base}&count=20&fields=firstName,city`, 0)).toEqual(first)
    expect(person(`${base}&count=20`, 1)).toEqual(person(`${base}&count=2`, 1))
    expect(person(`${base}&count=20`, 1).id).not.toBe(first.id)
  })

  it('uses a verified fictional phone range when one exists', () => {
    const result = person('country=US&city=Washington&gender=male&seed=contact-demo&asOf=2026-09-24')
    expect(result.phone).toMatch(/^\+120255501\d{2}$/)
    expect(result.address.city).toBe('Washington')
  })
})
