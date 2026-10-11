import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'

describe('portrait context checkbox selection', () => {
  it('includes only selected types and canonicalizes order for replay', async () => {
    const app = buildApp({ rateLimitMax: 100 })
    try {
      const url = '/people?count=100&nationality=CG&ageGroup=adult&seed=checkbox-demo&asOf=2026-10-10&portraitContexts=doctor,business'
      const response = await app.inject(url)
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.meta.portraitContexts).toEqual(['doctor', 'business'])
      expect(body.meta).not.toHaveProperty('portraitContext')
      const types = new Set<string>()
      for (const person of body.results) {
        expect(person.dob.age).toBeGreaterThanOrEqual(18)
        expect(person.dob.age).toBeLessThanOrEqual(64)
        expect(person.picture).not.toBeNull()
        const id = person.picture.large.split('/').at(-1).replace('.webp', '')
        const asset = portraitCatalog.assets.find(asset => asset.id === id)!
        expect(['doctor', 'business']).toContain(asset.portraitContext)
        types.add(asset.portraitContext!)
      }
      expect(types).toEqual(new Set(['doctor', 'business']))
      const reordered = await app.inject(url.replace('doctor,business', 'business,doctor'))
      expect(reordered.body).toBe(response.body)
      expect(reordered.headers.etag).toBe(response.headers.etag)
      expect((await app.inject({ url, headers: { 'if-none-match': response.headers.etag! } })).statusCode).toBe(304)
    } finally { await app.close() }
  })

  it('treats an explicit empty selection as no pictures, preserving ordinary ages', async () => {
    const app = buildApp()
    try {
      const response = await app.inject('/people?nationality=CG&ageGroup=senior&portraitContexts=&seed=no-pictures')
      expect(response.statusCode).toBe(200)
      expect(response.json().meta.portraitContexts).toEqual([])
      expect(response.json().results[0].picture).toBeNull()
      expect(response.json().results[0].dob.age).toBeGreaterThanOrEqual(65)
    } finally { await app.close() }
  })

  it('rejects ambiguous or invalid selections and empty age intersections', async () => {
    const app = buildApp({ rateLimitMax: 100 })
    try {
      for (const query of [
        'portraitContexts=doctor&portraitContext=standard',
        'portraitContexts=doctor,doctor', 'portraitContexts=astronaut',
        'portraitContexts=doctor,', 'portraitContexts=doctor&portraitContexts=business',
        'portraitContexts=doctor,business&ageGroup=child',
      ]) expect((await app.inject(`/people?${query}`)).statusCode, query).toBe(400)
    } finally { await app.close() }
  })
})
