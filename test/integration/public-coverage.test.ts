import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('public coverage endpoint', () => {
  it('returns the deployed country and portrait catalog coverage with a revalidation validator', async () => {
    const record = vi.fn(async () => {})
    const app = buildApp({ logger: false, analytics: { record } })
    const response = await app.inject({ method: 'GET', url: '/coverage' })
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('public, max-age=300')
    expect(response.headers.etag).toMatch(/^"[a-f0-9]{64}"$/)
    const body = response.json()
    expect(body.meta).toEqual({
      dataVersion: expect.any(String), catalogVersion: expect.any(String), portraitSelectionVersion: expect.any(String),
    })
    expect(body.countries).toHaveLength(249)
    expect(body.countries.find((country: { code: string }) => country.code === 'MW')).toMatchObject({
      code: 'MW', name: 'Malawi', status: 'available', sampledCities: expect.any(Number),
      postcodeCities: expect.any(Number), phone: expect.any(String), continent: '002', subregion: '014',
    })
    expect(body.portraits.total).toBeGreaterThan(0)
    expect(body.portraits.annotatedSkinTone).toBe(body.portraits.total)
    expect(body.portraits.contexts).toEqual(expect.arrayContaining([
      { id: 'standard', minAge: 6, maxAge: 100, count: expect.any(Number), weight: 50 },
      { id: 'business', minAge: 18, maxAge: 64, count: expect.any(Number), weight: 25 },
      { id: 'school-pupil', minAge: 6, maxAge: 17, count: expect.any(Number), weight: 15 },
      { id: 'doctor', minAge: 25, maxAge: 64, count: expect.any(Number), weight: 5 },
      { id: 'construction', minAge: 18, maxAge: 64, count: expect.any(Number), weight: 5 },
    ]))
    expect(body.portraits.contexts).toHaveLength(5)
    expect(body.portraits.skinTones).toHaveLength(10)
    expect(body.portraits.skinTones.reduce((sum: number, tone: { count: number }) => sum + tone.count, 0))
      .toBe(body.portraits.annotatedSkinTone)
    expect((await app.inject({ method: 'GET', url: '/coverage', headers: { 'if-none-match': `W/${response.headers.etag}` } })).statusCode)
      .toBe(304)
    expect((await app.inject({ method: 'GET', url: '/coverage', headers: { 'if-none-match': `"other", ${response.headers.etag}` } })).statusCode)
      .toBe(304)
    const invalid = await app.inject({ method: 'GET', url: '/coverage?unknown=1' })
    expect(invalid.statusCode).toBe(400)
    expect(invalid.json()).toEqual({ error: { code: 'UNKNOWN_QUERY_PARAMETER', message: 'Coverage does not accept query parameters' } })
    expect(record).not.toHaveBeenCalled()
    await app.close()
  })

  it('supports HEAD and CORS under the shared HTTP guardrails', async () => {
    const app = buildApp({ logger: false })
    const head = await app.inject({ method: 'HEAD', url: '/coverage' })
    expect(head.statusCode).toBe(200)
    expect(head.body).toBe('')
    expect(head.headers.etag).toMatch(/^"[a-f0-9]{64}"$/)
    expect(head.headers['cache-control']).toBe('public, max-age=300')
    const options = await app.inject({ method: 'OPTIONS', url: '/coverage', headers: {
      origin: 'https://client.example', 'access-control-request-method': 'GET',
    } })
    expect(options.statusCode).toBe(204)
    expect(options.headers['access-control-allow-origin']).toBe('*')
    await app.close()
  })

  it('returns a method response for unsupported coverage methods', async () => {
    const app = buildApp({ logger: false })
    const response = await app.inject({ method: 'POST', url: '/coverage' })
    expect(response.statusCode).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD, OPTIONS')
    await app.close()
  })
})
