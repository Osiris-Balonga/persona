import { describe, expect, it } from 'vitest'
import { parsePeopleQuery } from '../../src/people-query.js'
import { createGenerationContext } from '../../src/replay.js'

const versions = { dataVersion: 'geo-v1', catalogVersion: 'portraits-v1' }
const parse = (value: string) => parsePeopleQuery(new URLSearchParams(value))

describe('versioned generation identity', () => {
  it('repeats component keys for the same seeded request regardless of query order', () => {
    const first = createGenerationContext(parse('seed=school-demo&asOf=2026-09-24&country=CG&age=14'), versions)
    const reordered = createGenerationContext(parse('age=14&country=CG&asOf=2026-09-24&seed=school-demo'), versions)

    expect(first.componentKey(0, 'identity')).toBe(reordered.componentKey(0, 'identity'))
    expect(first.componentKey(0, 'identity')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('separates seed, date, filter, versions, person index, and component', () => {
    const baseQuery = 'seed=school-demo&asOf=2026-09-24&country=CG'
    const base = createGenerationContext(parse(baseQuery), versions)
    const key = base.componentKey(0, 'identity')

    expect(createGenerationContext(parse(baseQuery.replace('school-demo', 'site-demo')), versions).componentKey(0, 'identity')).not.toBe(key)
    expect(createGenerationContext(parse(baseQuery.replace('2026-09-24', '2026-09-25')), versions).componentKey(0, 'identity')).not.toBe(key)
    expect(createGenerationContext(parse(baseQuery.replace('country=CG', 'country=FR')), versions).componentKey(0, 'identity')).not.toBe(key)
    expect(createGenerationContext(parse(baseQuery), { ...versions, dataVersion: 'geo-v2' }).componentKey(0, 'identity')).not.toBe(key)
    expect(createGenerationContext(parse(baseQuery), { ...versions, catalogVersion: 'portraits-v2' }).componentKey(0, 'identity')).not.toBe(key)
    expect(base.componentKey(1, 'identity')).not.toBe(key)
    expect(base.componentKey(0, 'portrait')).not.toBe(key)
  })

  it('does not shift a person or component when count or fields changes', () => {
    const base = createGenerationContext(parse('seed=school-demo&asOf=2026-09-24&count=1'), versions)
    const selected = createGenerationContext(parse('seed=school-demo&asOf=2026-09-24&count=20&fields=firstName,picture.url'), versions)

    expect(selected.componentKey(0, 'identity')).toBe(base.componentKey(0, 'identity'))
    expect(selected.componentKey(0, 'portrait')).toBe(base.componentKey(0, 'portrait'))
    expect(selected.componentKey(0, 'identity')).not.toBe(selected.componentKey(0, 'portrait'))
  })

  it('uses one fresh entropy value per unseeded request without changing public seed metadata', () => {
    const query = parse('asOf=2026-09-24')
    const first = createGenerationContext(query, versions, () => 'random-request-a')
    const second = createGenerationContext(query, versions, () => 'random-request-b')

    expect(query.seed).toBeUndefined()
    expect(first.componentKey(0, 'identity')).toBe(first.componentKey(0, 'identity'))
    expect(first.componentKey(0, 'identity')).not.toBe(second.componentKey(0, 'identity'))
  })
})
