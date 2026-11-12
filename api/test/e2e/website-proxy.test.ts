import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { proxyApiRequest } from '../../../web/src/lib/api-proxy.ts'

describe('website public entry over HTTP', () => {
  it('returns legacy bytes, records one event and retains separate visitor quotas across a real upstream connection', async () => {
    const token = 'fixture-shared-token-at-least-32-characters'
    const events: { statusCode: number; profileCount: number }[] = []
    const app = buildApp({ apiProxyToken: token, rateLimitMax: 1, analytics: { record: async event => { events.push(event) } } })
    try {
      const address = await app.listen({ host: '127.0.0.1', port: 0 })
      const query = '?count=1&nationality=CG&seed=website-proxy&asOf=2026-11-12&fields=name,picture'
      const legacy = await app.inject({ url: `/people${query}`, remoteAddress: '192.0.2.100' })
      const request = (ip: string) => proxyApiRequest(new Request(`https://persona.example.test/api${query}`, {
        headers: { 'x-forwarded-for': ip, 'x-persona-client-ip': '203.0.113.99' },
      }), { upstream: address, token, vercel: true })
      const first = await request('198.51.100.1')
      expect(first.status).toBe(200)
      expect(await first.text()).toBe(legacy.body)
      expect(first.headers.get('etag')).toBe(legacy.headers.etag)
      expect((await request('198.51.100.2')).status).toBe(200)
      const limited = await request('198.51.100.1')
      expect(limited.status).toBe(429)
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
      expect(events.map(event => [event.statusCode, event.profileCount])).toEqual([[200, 1], [200, 1], [200, 1], [429, 0]])
    } finally { await app.close() }
  })
})
