import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('public API over HTTP', () => {
  it('serves a keyless response and returns a retry hint when the client exceeds its quota', async () => {
    const app = buildApp({ rateLimitMax: 1 })
    try {
      const address = await app.listen({ host: '127.0.0.1', port: 0 })
      const url = `${address}/people?country=MW&seed=pilot&asOf=2026-09-24`
      const first = await fetch(url)
      expect(first.status).toBe(200)
      expect((await first.json()).results[0].country).toBe('MW')
      const second = await fetch(url)
      expect(second.status).toBe(429)
      expect(Number(second.headers.get('retry-after'))).toBeGreaterThan(0)
      expect((await second.json()).error.code).toBe('RATE_LIMITED')
    } finally { await app.close() }
  })
})
