import { describe, expect, it } from 'vitest'
import { parsePeopleQuery } from '../../src/people-query.js'
import { peopleCacheHeaders } from '../../src/cache-policy.js'

const versions = { dataVersion: 'geo-v1', catalogVersion: 'portraits-v1' }
const parse = (value: string) => parsePeopleQuery(new URLSearchParams(value))
const cache = (query: string, explicitAsOf = true, statusCode = 200) =>
  peopleCacheHeaders(statusCode, parse(query), explicitAsOf, versions)

describe('GET /people cache policy', () => {
  it('allows private revalidation only for seeded requests with an explicit reference date', () => {
    const headers = cache('seed=school-demo&asOf=2026-09-24&country=CG')

    expect(headers['Cache-Control']).toBe('private, no-cache')
    expect(headers.ETag).toMatch(/^"persona-v1-[a-f0-9]{64}"$/)
    expect(cache('asOf=2026-09-24')['Cache-Control']).toBe('no-store')
    expect(cache('seed=school-demo', false)['Cache-Control']).toBe('no-store')
    expect(cache('seed=school-demo&asOf=2026-09-24', true, 429)).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('varies the validator across representation inputs and versions', () => {
    const base = 'seed=school-demo&asOf=2026-09-24&country=CG'
    const tag = cache(base).ETag

    expect(cache(`${base}&count=2`).ETag).not.toBe(tag)
    expect(cache(`${base}&fields=firstName`).ETag).not.toBe(tag)
    expect(cache(base.replace('country=CG', 'country=FR')).ETag).not.toBe(tag)
    expect(cache(base, true, 200).ETag).toBe(tag)
    expect(peopleCacheHeaders(200, parse(base), true, { ...versions, dataVersion: 'geo-v2' }).ETag).not.toBe(tag)
    expect(peopleCacheHeaders(200, parse(base), true, { ...versions, catalogVersion: 'portraits-v2' }).ETag).not.toBe(tag)
  })
})
