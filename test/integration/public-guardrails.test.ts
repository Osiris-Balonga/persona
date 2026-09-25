import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('public API guardrails', () => {
  it('isolates clients by socket IP and ignores spoofed forwarding headers', async () => {
    const app = buildApp({ rateLimitMax: 2 })
    try {
      const request = (remoteAddress: string, forwarded?: string) => app.inject({
        method: 'GET', url: '/people?count=1&country=MW', remoteAddress,
        headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
      })
      expect((await request('198.51.100.1', '203.0.113.1')).statusCode).toBe(200)
      expect((await request('198.51.100.1', '203.0.113.2')).statusCode).toBe(200)
      const limited = await request('198.51.100.1', '203.0.113.3')
      expect(limited.statusCode).toBe(429)
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0)
      expect(limited.headers['cache-control']).toBe('no-store')
      expect(limited.json()).toEqual({ error: { code: 'RATE_LIMITED', message: 'Too many requests; try again later' } })
      expect((await request('198.51.100.2')).statusCode).toBe(200)
    } finally { await app.close() }
  })

  it('trusts forwarded IP and HTTPS only from configured proxies', async () => {
    const app = buildApp({ rateLimitMax: 1, trustedProxies: '127.0.0.1', requireHttps: true })
    try {
      const headers = { 'x-forwarded-proto': 'https', 'x-forwarded-for': '198.51.100.3' }
      expect((await app.inject({ method: 'GET', url: '/people?country=MW', remoteAddress: '127.0.0.1', headers })).statusCode).toBe(200)
      expect((await app.inject({ method: 'GET', url: '/people?country=MW', remoteAddress: '127.0.0.1', headers })).statusCode).toBe(429)
      const spoof = await app.inject({ method: 'GET', url: '/people?country=MW', remoteAddress: '203.0.113.8', headers })
      expect(spoof.statusCode).toBe(403)
    } finally { await app.close() }
  })

  it('allows only documented browser methods and rejects oversized input', async () => {
    const app = buildApp()
    try {
      const preflight = await app.inject({ method: 'OPTIONS', url: '/people', headers: {
        origin: 'https://client.example.test', 'access-control-request-method': 'GET',
      } })
      expect(preflight.statusCode).toBe(204)
      expect(preflight.headers['access-control-allow-origin']).toBe('*')
      expect(preflight.headers['access-control-allow-methods']).toBe('GET, HEAD')
      expect((await app.inject({ method: 'POST', url: '/people', payload: '{}' })).statusCode).toBe(405)
      expect((await app.inject({ method: 'GET', url: `/people?seed=${'a'.repeat(3000)}` })).statusCode).toBe(400)
      const oversized = await app.inject({ method: 'POST', url: '/people',
        headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ note: 'a'.repeat(2_000) }) })
      expect(oversized.statusCode).toBe(413)
      expect(oversized.json().error.code).toBe('REQUEST_TOO_LARGE')
      const unexpectedBody = await app.inject({ method: 'GET', url: '/people',
        headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ note: 'a'.repeat(2_000) }) })
      expect(unexpectedBody.statusCode).toBe(400)
    } finally { await app.close() }
  })

  it('bounds a full response before sending it', async () => {
    const app = buildApp({ maxResponseBytes: 1_024 })
    try {
      const response = await app.inject({ method: 'GET', url: '/people?count=100&country=MW&seed=large&asOf=2026-09-24' })
      expect(response.statusCode).toBe(503)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.json()).toEqual({ error: { code: 'RESPONSE_TOO_LARGE', message: 'Response exceeds the service limit' } })
    } finally { await app.close() }
  })
})
