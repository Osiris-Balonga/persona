import { describe, expect, it } from 'vitest'
import { parsePeopleQuery } from '../../src/people-query.js'
import { createGenerationContext } from '../../src/replay.js'
import { appearanceCategories } from '../../src/geography/appearance.js'
import { getCountry } from '../../src/geography/countries.js'
import { getCity } from '../../src/geography/cities.js'
import { chooseWeighted, resolveGeographicContext } from '../../src/geography/distribution.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'

const versions = { dataVersion: '2026-09-24', catalogVersion: 'empty-v1' }
const query = (value: string) => parsePeopleQuery(new URLSearchParams(value))

describe('seeded geographic choices', () => {
  it('respects explicit country, city, and appearance independently', () => {
    const filters = query('country=MW&city=Lilongwe&appearance=east-asian&seed=profile-demo&asOf=2026-09-24')
    const key = createGenerationContext(filters, versions).componentKey(0, 'geography')
    expect(resolveGeographicContext(filters, key)).toMatchObject({
      country: { code: 'MW' }, city: { name: 'Lilongwe' }, appearance: 'east-asian',
    })
  })

  it('makes unfiltered choices stable and keeps the city in its chosen country', () => {
    const filters = query('seed=profile-demo&asOf=2026-09-24')
    const key = createGenerationContext(filters, versions).componentKey(0, 'geography')
    const person = resolveGeographicContext(filters, key)
    expect(resolveGeographicContext(filters, key)).toEqual(person)
    expect(getCountry(person.country.code)?.generation).toBe('eligible')
    expect(canGenerateProfile(person.country)).toBe(true)
    expect(getCity(person.country.code, person.city.name)).toEqual(person.city)
    expect(appearanceCategories).toContain(person.appearance)
  })

  it('uses country-specific appearance weights for unfiltered appearances', () => {
    const firstDraw = '0'.repeat(64)
    expect(resolveGeographicContext({ country: 'FR' }, firstDraw).appearance).toBe('european')
    expect(resolveGeographicContext({ country: 'CG' }, firstDraw).appearance).toBe('central-african')
    expect(resolveGeographicContext({ country: 'MA' }, firstDraw).appearance).toBe('north-african')
    const franceSecondDraw = `${'0'.repeat(24)}${'12'.padStart(12, '0')}${'0'.repeat(28)}`
    expect(resolveGeographicContext({ country: 'FR' }, franceSecondDraw).appearance).toBe('north-african')
  })

  it('does not select or accept an unreviewed country for a beta profile', () => {
    const filters = query('seed=profile-demo&asOf=2026-09-24')
    const zeroKey = '0'.repeat(64)
    expect(resolveGeographicContext(filters, zeroKey).country.code).toBe('AD')
    expect(() => resolveGeographicContext({ country: 'PN' }, zeroKey)).toThrow(RangeError)
  })

  it('rejects invalid weights rather than silently biasing choices', () => {
    expect(() => chooseWeighted([{ value: 'a', weight: 1 }, { value: 'b', weight: 0 }], 0)).toThrow(RangeError)
  })
})
