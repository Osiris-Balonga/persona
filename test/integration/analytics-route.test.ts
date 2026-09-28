import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('API usage collection', () => {
  it('counts only GET /people responses and profiles actually returned', async () => {
    const record = vi.fn(async () => {})
    const app = buildApp({ analytics: { record } })
    try {
      await app.inject({ method: 'GET', url: '/health' })
      await app.inject({ method: 'HEAD', url: '/people?count=2' })
      await app.inject({ method: 'GET', url: '/unknown' })
      expect(record).not.toHaveBeenCalled()

      const response = await app.inject({ method: 'GET', url: '/people?nationality=CG&count=3&seed=analytics&asOf=2026-09-28' })
      expect(response.statusCode).toBe(200)
      expect(record).toHaveBeenCalledOnce()
      expect(record).toHaveBeenCalledWith({ statusCode: 200, profileCount: 3,
        durationMs: expect.any(Number) })
      expect(record.mock.calls[0][0].durationMs).toBeGreaterThanOrEqual(0)
    } finally { await app.close() }
  })

  it('counts cache revalidation, invalid requests, and rate limits without inventing profiles', async () => {
    const record = vi.fn(async () => {})
    const app = buildApp({ analytics: { record }, rateLimitMax: 3 })
    try {
      const first = await app.inject({ method: 'GET', url: '/people?nationality=CG&seed=analytics&asOf=2026-09-28' })
      const cached = await app.inject({ method: 'GET', url: '/people?nationality=CG&seed=analytics&asOf=2026-09-28',
        headers: { 'if-none-match': String(first.headers.etag) } })
      const invalid = await app.inject({ method: 'GET', url: '/people?age=5' })
      const limited = await app.inject({ method: 'GET', url: '/people?nationality=CG' })
      expect([first.statusCode, cached.statusCode, invalid.statusCode, limited.statusCode]).toEqual([200, 304, 400, 429])
      expect(record.mock.calls.map(([event]) => [event.statusCode, event.profileCount])).toEqual([
        [200, 1], [304, 0], [400, 0], [429, 0],
      ])
    } finally { await app.close() }
  })

  it('does not fail a successful API response if the analytics destination fails', async () => {
    const app = buildApp({ analytics: { record: async () => { throw new Error('analytics unavailable') } } })
    try {
      const response = await app.inject({ method: 'GET', url: '/people?nationality=CG' })
      expect(response.statusCode).toBe(200)
      expect(response.json().results).toHaveLength(1)
    } finally { await app.close() }
  })
})
