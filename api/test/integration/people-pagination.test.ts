import { afterEach, describe, expect, it, vi } from 'vitest'
import Value from 'typebox/value'
import { buildApp } from '../../src/app.js'
import { ProjectedPublicPeopleResponseSchema } from '../../src/contracts/public-people.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'

afterEach(() => { vi.useRealTimers() })
const replay = 'nationality=CG&gender=female&seed=pagination-demo&asOf=2026-11-12&fields=id,name,picture,location'

describe('people cursor pagination', () => {
  it('returns the requested total in bounded pages, preserving order when limit changes', async () => {
    const app = buildApp({ rateLimitMax: 1000 })
    try {
      const first = await app.inject(`/people?${replay}&count=235&limit=70`)
      expect(first.statusCode).toBe(200)
      const one = first.json()
      expect(Value.Check(ProjectedPublicPeopleResponseSchema, one)).toBe(true)
      expect(one.results).toHaveLength(70)
      expect(one.meta).toMatchObject({ count: 70, seed: 'pagination-demo',
        pagination: { total: 235, limit: 70, offset: 0, nextCursor: expect.any(String) } })

      const second = await app.inject(`/people?cursor=${encodeURIComponent(one.meta.pagination.nextCursor)}&limit=90`)
      expect(second.statusCode).toBe(200)
      const two = second.json()
      expect(two.results).toHaveLength(90)
      expect(two.meta.pagination).toMatchObject({ total: 235, limit: 90, offset: 70, nextCursor: expect.any(String) })

      const third = await app.inject(`/people?cursor=${encodeURIComponent(two.meta.pagination.nextCursor)}`)
      expect(third.statusCode).toBe(200)
      const three = third.json()
      expect(three.results).toHaveLength(75)
      expect(three.meta.pagination).toEqual({ total: 235, limit: 90, offset: 160, nextCursor: null })
      const people = [...one.results, ...two.results, ...three.results]
      expect(new Set(people.map(person => person.id)).size).toBe(235)

      // Existing single-response behavior is an independent compatibility reference.
      const legacy = await app.inject(`/people?${replay}&count=100`)
      expect(legacy.statusCode).toBe(200)
      expect(people.slice(0, 100)).toEqual(legacy.json().results)
      expect(legacy.json().meta).not.toHaveProperty('pagination')

      const alternate = await app.inject(`/people?${replay}&count=235&limit=100`)
      const pageB = await app.inject(`/people?cursor=${encodeURIComponent(alternate.json().meta.pagination.nextCursor)}`)
      const pageC = await app.inject(`/people?cursor=${encodeURIComponent(pageB.json().meta.pagination.nextCursor)}`)
      expect([...alternate.json().results, ...pageB.json().results, ...pageC.json().results]).toEqual(people)
    } finally { await app.close() }
  })

  it('defaults large totals to pages of 100 while leaving old small requests unchanged', async () => {
    const app = buildApp()
    try {
      const first = await app.inject('/people?count=105&seed=total&asOf=2026-11-12')
      expect(first.statusCode).toBe(200)
      expect(first.json().results).toHaveLength(100)
      expect(first.json().meta.pagination).toMatchObject({ total: 105, limit: 100, offset: 0 })
      const last = await app.inject(`/people?cursor=${encodeURIComponent(first.json().meta.pagination.nextCursor)}`)
      expect(last.json().results).toHaveLength(5)
      expect(last.json().meta.pagination.nextCursor).toBeNull()
      const old = await app.inject('/people?count=2')
      expect(old.json().meta).toMatchObject({ count: 2, seed: null })
      expect(old.json().meta).not.toHaveProperty('pagination')
    } finally { await app.close() }
  })

  it('fixes fresh entropy and the reference date for every continuation across midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T23:59:59Z'))
    const app = buildApp()
    try {
      const first = await app.inject('/people?count=3&limit=2&fields=id,name')
      expect(first.statusCode).toBe(200)
      const one = first.json()
      expect(one.meta.seed).toEqual(expect.any(String))
      expect(one.meta.asOf).toBe('2026-11-12')
      expect(first.headers['cache-control']).toBe('no-store')
      vi.setSystemTime(new Date('2026-11-13T00:00:01Z'))
      const last = await app.inject(`/people?cursor=${encodeURIComponent(one.meta.pagination.nextCursor)}`)
      expect(last.statusCode).toBe(200)
      expect(last.json().meta).toMatchObject({ seed: one.meta.seed, asOf: '2026-11-12', count: 1 })
      const replayed = await app.inject(`/people?count=3&seed=${one.meta.seed}&asOf=2026-11-12&fields=id,name`)
      expect([...one.results, ...last.json().results]).toEqual(replayed.json().results)
    } finally { await app.close() }
  })

  it('uses a page-specific validator and rejects continuations after a catalogue change', async () => {
    const app = buildApp()
    const changed = buildApp({ portraitCatalog: { ...portraitCatalog, publicBaseUrl: 'https://different.example.test' } })
    try {
      const first = await app.inject(`/people?${replay}&count=201&limit=100`)
      expect(first.statusCode).toBe(200)
      const cursor = first.json().meta.pagination.nextCursor
      const url = `/people?cursor=${encodeURIComponent(cursor)}`
      const next = await app.inject({ url, headers: { 'if-none-match': first.headers.etag! } })
      expect(next.statusCode).toBe(200)
      expect(next.headers.etag).not.toBe(first.headers.etag)
      const conditional = await app.inject({ url, headers: { 'if-none-match': next.headers.etag! } })
      expect(conditional.statusCode).toBe(304)
      const stale = await changed.inject(url)
      expect(stale.statusCode).toBe(400)
      expect(stale.json().error.parameter).toBe('cursor')
      const altered = await app.inject(`${url}&nationality=FR`)
      expect(altered.statusCode).toBe(400)
    } finally { await Promise.all([app.close(), changed.close()]) }
  })

  it.each(['count=10001', 'count=0', 'count=2&limit=0', 'count=2&limit=101', 'limit=1.5',
    'cursor=', `cursor=${'a'.repeat(4097)}`, 'cursor=not-a-cursor', 'limit=1&limit=2'])(
    'rejects invalid or excessive pagination: %s', async query => {
      const app = buildApp()
      try {
        const response = await app.inject(`/people?${query}`)
        expect(response.statusCode).toBe(400)
        expect(response.headers['cache-control']).toBe('no-store')
      } finally { await app.close() }
    },
  )
})
