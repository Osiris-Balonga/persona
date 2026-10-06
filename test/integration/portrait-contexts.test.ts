import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('public portrait context filter', () => {
  it('serves a coherent uncovered doctor profile and context-specific HEAD/304', async () => {
    const app = buildApp({ rateLimitMax: 100 })
    try {
      const query = '/people?nationality=CG&portraitContext=doctor&ageGroup=adult&seed=doctor-pilot&asOf=2026-10-06'
      const doctor = await app.inject(query)
      expect(doctor.statusCode).toBe(200)
      const body = doctor.json()
      expect(body.results[0].dob.age).toBeGreaterThanOrEqual(25)
      expect(body.results[0].dob.age).toBeLessThanOrEqual(64)
      expect(body.results[0].picture).toBeNull()
      expect(body.meta.portraitContext).toBe('doctor')
      expect(body.meta.portraitSelectionVersion).toBe('contexts-v1')
      const standard = await app.inject(query.replace('portraitContext=doctor', 'portraitContext=standard'))
      expect(standard.statusCode).toBe(200)
      expect(standard.headers.etag).not.toBe(doctor.headers.etag)
      expect((await app.inject({ url: query, headers: { 'if-none-match': standard.headers.etag! } })).statusCode).toBe(200)
      expect((await app.inject({ url: query, headers: { 'if-none-match': doctor.headers.etag! } })).statusCode).toBe(304)
      const head = await app.inject({ url: query, method: 'HEAD' })
      expect(head.statusCode).toBe(200)
      expect(head.headers.etag).toBe(doctor.headers.etag)
      expect(head.body).toBe('')
    } finally { await app.close() }
  })

  it('returns safe structured errors for conflicting, unknown and repeated contexts', async () => {
    const app = buildApp()
    try {
      for (const [query, code, parameter] of [
        ['portraitContext=doctor&ageGroup=child', 'CONFLICTING_FILTERS', 'ageGroup'],
        ['portraitContext=astronaut', 'UNSUPPORTED_VALUE', 'portraitContext'],
        ['portraitContext=doctor&portraitContext=business', 'INVALID_QUERY', 'portraitContext'],
      ]) {
        const response = await app.inject(`/people?${query}`)
        expect(response.statusCode).toBe(400)
        expect(response.json().error).toMatchObject({ code, parameter })
        expect(response.headers['cache-control']).toBe('no-store')
      }
    } finally { await app.close() }
  })
})
