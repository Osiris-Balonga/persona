import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'

describe('public skinTone query', () => {
  it('strictly filters reviewed annotations, preserves seeded profile fields, and exposes the applied filter', async () => {
    const app = buildApp()
    try {
      const base = '/people?nationality=CG&ageGroup=adult&count=12&seed=tone-review&asOf=2026-10-11'
      const original = await app.inject(base)
      const selected = await app.inject(`${base}&skinTone=7`)
      expect(selected.statusCode).toBe(200)
      expect(selected.json().meta.skinTone).toBe(7)
      for (const [index, person] of selected.json().results.entries()) {
        expect(person.name).toEqual(original.json().results[index].name)
        expect(person.dob).toEqual(original.json().results[index].dob)
        expect(person.location).toEqual(original.json().results[index].location)
        if (person.picture !== null) {
          const id = person.picture.large.split('/').at(-1).replace('.webp', '')
          expect(portraitCatalog.assets.find(asset => asset.id === id)?.skinToneMst).toBe(7)
        }
      }
      expect(selected.json().results.some((person: { picture: unknown }) => person.picture !== null)).toBe(true)
      expect(selected.headers.etag).not.toBe(original.headers.etag)
      expect((await app.inject({ url: `${base}&skinTone=7`, headers: { 'if-none-match': selected.headers.etag! } })).statusCode).toBe(304)
      const noMatch = await app.inject(`${base}&portraitContexts=business&skinTone=7`)
      expect(noMatch.statusCode).toBe(200)
      expect(noMatch.json().results.every((person: { picture: unknown }) => person.picture === null)).toBe(true)
    } finally { await app.close() }
  })
})
