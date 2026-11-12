import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('Persona v1 public entry and legacy compatibility', () => {
  it('returns identical seeded profiles, validators and schema through the new and legacy entries', async () => {
    const record = vi.fn(async () => {})
    const app = buildApp({ analytics: { record } })
    try {
      const query = '?nationality=CG&count=2&seed=entry-migration&asOf=2026-11-12&fields=name,picture'
      const legacy = await app.inject({ url: `/people${query}` })
      expect(legacy.statusCode).toBe(200)
      expect(legacy.json().meta.schemaVersion).toBe('2') // Existing serialization revision, not the product release.
      for (const path of ['/api', '/api/', '/api/people']) {
        const response = await app.inject({ url: `${path}${query}` })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(legacy.body)
        expect(response.headers.etag).toBe(legacy.headers.etag)
        expect(response.headers['cache-control']).toBe(legacy.headers['cache-control'])
        expect((await app.inject({ url: `${path}${query}`, headers: { 'if-none-match': String(response.headers.etag) } })).statusCode).toBe(304)
      }
      expect(record).toHaveBeenCalledTimes(7)
      expect(record.mock.calls[0][0]).toMatchObject({ statusCode: 200, profileCount: 2 })
    } finally { await app.close() }
  })

  it('preserves errors, HEAD and browser preflights without locale redirects', async () => {
    const app = buildApp()
    try {
      const invalid = await app.inject({ url: '/api?unknown=1' })
      expect(invalid.statusCode).toBe(400)
      expect(invalid.headers.location).toBeUndefined()
      expect(invalid.json().error.parameter).toBe('unknown')
      expect((await app.inject({ method: 'HEAD', url: '/api?nationality=CG' })).body).toBe('')
      expect((await app.inject({ method: 'POST', url: '/api' })).statusCode).toBe(405)
      const preflight = await app.inject({ method: 'OPTIONS', url: '/api', headers: {
        origin: 'https://client.example.test', 'access-control-request-method': 'GET',
      } })
      expect(preflight.statusCode).toBe(204)
      expect(preflight.headers['access-control-allow-origin']).toBe('*')
      expect((await app.inject({ url: '/api/health' })).json()).toEqual({ status: 'ok' })
      expect((await app.inject({ url: '/api/coverage' })).statusCode).toBe(200)
      expect((await app.inject({ url: '/apiary' })).statusCode).toBe(404)
    } finally { await app.close() }
  })

  it('separates authenticated website clients and ignores forged proxy identities', async () => {
    const app = buildApp({ rateLimitMax: 1, apiProxyToken: 'fixture-proxy-token-with-at-least-32-characters' })
    const request = (ip: string, token = 'fixture-proxy-token-with-at-least-32-characters', remoteAddress = '192.0.2.10') =>
      app.inject({ url: '/people?nationality=CG', remoteAddress, headers: {
        'x-persona-proxy-token': token, 'x-persona-client-ip': ip,
      } })
    try {
      expect((await request('198.51.100.1')).statusCode).toBe(200)
      expect((await request('198.51.100.2')).statusCode).toBe(200)
      const limited = await request('198.51.100.1')
      expect(limited.statusCode).toBe(429)
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0)
      expect((await request('198.51.100.3', 'forged', '192.0.2.20')).statusCode).toBe(200)
      expect((await request('198.51.100.4', 'forged', '192.0.2.20')).statusCode).toBe(429)
      expect((await request('not-an-ip', undefined, '192.0.2.30')).statusCode).toBe(200)
      expect((await request('also-not-an-ip', undefined, '192.0.2.30')).statusCode).toBe(429)
    } finally { await app.close() }
  })
})
