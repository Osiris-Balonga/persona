import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'

describe('public skinTone query', () => {
  it('uses a matching foreign portrait without changing nationality, residence or other identity fields', async () => {
    const foreignCatalog: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [{
      id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
      ageGroup: 'teen', apparentAgeRanges: [[13, 15], [16, 17]], gender: 'female',
      collection: 'europe-west', visualGroup: 'european', appearance: 'european', appearanceTags: ['european'],
      skinToneMst: 2, rights: 'Fictional portrait fixture', sha256: 'b'.repeat(64), reviewStatus: 'approved',
    }] }
    const app = buildApp({ portraitCatalog: foreignCatalog })
    try {
      const base = '/people?nationality=CG&residenceCountry=FR&gender=female&ageGroup=teen&count=3&seed=global-tone&asOf=2026-10-11&portraitContexts=standard'
      const original = await app.inject(base)
      const filtered = await app.inject(`${base}&skinTone=2`)
      expect(filtered.statusCode).toBe(200)
      expect(original.json().results.every((person: { picture: unknown }) => person.picture === null)).toBe(true)
      for (const [index, person] of filtered.json().results.entries()) {
        expect(person.picture?.large).toBe('https://images.example.test/portraits/v1/large/p_0001.webp')
        expect(person.nationality).toBe('CG')
        expect(person.location.country.code).toBe('FR')
        const { picture: _picture, ...identity } = person
        const { picture: _originalPicture, ...originalIdentity } = original.json().results[index]
        expect(identity).toEqual(originalIdentity)
      }
      const replay = await app.inject(`${base}&skinTone=2`)
      expect(replay.json()).toEqual(filtered.json())
      expect(replay.headers.etag).toBe(filtered.headers.etag)
      expect((await app.inject({ url: `${base}&skinTone=2`, headers: { 'if-none-match': replay.headers.etag! } })).statusCode).toBe(304)
    } finally { await app.close() }
  })

  it('invalidates cached missing pictures after an annotation correction without changing seeded identities', async () => {
    const before: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [{
      id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
      ageGroup: 'teen', apparentAgeRanges: [[13, 15], [16, 17]], gender: 'female',
      collection: 'africa-central', visualGroup: 'black', appearance: 'black', appearanceTags: ['black'],
      skinToneMst: 6, rights: 'Fictional portrait fixture', sha256: 'a'.repeat(64), reviewStatus: 'approved',
    }] }
    const after = { ...before, assets: before.assets.map(asset => ({ ...asset, skinToneMst: 7 })) }
    const oldApp = buildApp({ portraitCatalog: before })
    const correctedApp = buildApp({ portraitCatalog: after })
    try {
      const url = '/people?nationality=CG&gender=female&ageGroup=teen&count=3&seed=amended-tone&asOf=2026-10-11&portraitContexts=standard&skinTone=7'
      const cached = await oldApp.inject(url)
      expect(cached.json().results.every((person: { picture: unknown }) => person.picture === null)).toBe(true)
      const fresh = await correctedApp.inject({ url, headers: { 'if-none-match': cached.headers.etag! } })
      expect(fresh.statusCode).toBe(200)
      expect(fresh.headers.etag).not.toBe(cached.headers.etag)
      for (const [index, person] of fresh.json().results.entries()) {
        expect(person.picture.large).toContain('/p_0001.webp')
        expect(person.name).toEqual(cached.json().results[index].name)
        expect(person.dob).toEqual(cached.json().results[index].dob)
      }
    } finally { await oldApp.close(); await correctedApp.close() }
  })

  it.each([
    ['doctor', 'adult'], ['construction', 'adult'], ['business', 'adult'], ['school-pupil', 'teen'],
  ])('delivers annotated %s portraits instead of losing the whole category to the tone filter', async (context, ageGroup) => {
    const app = buildApp()
    try {
      const base = `/people?nationality=CG&ageGroup=${ageGroup}&portraitContexts=${context}&count=30&seed=context-tones&asOf=2026-10-11`
      const original = await app.inject(base)
      const filtered = await app.inject(`${base}&skinTone=7`)
      expect(filtered.statusCode).toBe(200)
      const pictures = filtered.json().results.filter((person: { picture: unknown }) => person.picture !== null)
      expect(pictures.length).toBeGreaterThan(0)
      for (const [index, person] of filtered.json().results.entries()) {
        expect(person.name).toEqual(original.json().results[index].name)
        expect(person.dob).toEqual(original.json().results[index].dob)
        if (!person.picture) continue
        const id = person.picture.large.split('/').at(-1).replace('.webp', '')
        const portrait = portraitCatalog.assets.find(asset => asset.id === id)
        expect(portrait?.portraitContext).toBe(context)
        expect(portrait?.skinToneMst).toBe(7)
        expect(portrait?.gender).toBe(person.gender)
        expect(portrait?.apparentAgeRanges.some(([min, max]) => person.dob.age >= min && person.dob.age <= max)).toBe(true)
      }
    } finally { await app.close() }
  })

  it('keeps an explicit empty selection and returns identities without portraits', async () => {
    const app = buildApp()
    try {
      const base = '/people?nationality=CG&ageGroup=adult&count=3&seed=empty-tones&asOf=2026-10-11'
      const original = await app.inject(base)
      const empty = await app.inject(`${base}&skinTone=`)
      expect(empty.statusCode).toBe(200)
      expect(empty.json().meta.skinTone).toEqual([])
      expect(original.json().meta).not.toHaveProperty('skinTone')
      for (const [index, person] of empty.json().results.entries()) {
        expect(person.picture).toBeNull()
        expect(person.name).toEqual(original.json().results[index].name)
        expect(person.dob).toEqual(original.json().results[index].dob)
      }
      expect(empty.headers.etag).not.toBe(original.headers.etag)
    } finally { await app.close() }
  })
  it('delivers a union of tones with canonical metadata, replay and validators', async () => {
    const app = buildApp()
    try {
      const base = '/people?nationality=CG&ageGroup=adult&count=12&seed=tone-union&asOf=2026-10-11'
      const selected = await app.inject(`${base}&skinTone=8,7`)
      expect(selected.statusCode).toBe(200)
      expect(selected.json().meta.skinTone).toEqual([7, 8])
      const pictures = selected.json().results.filter((person: { picture: unknown }) => person.picture !== null)
      expect(pictures.length).toBeGreaterThan(0)
      for (const person of pictures) {
        const id = person.picture.large.split('/').at(-1).replace('.webp', '')
        expect([7, 8]).toContain(portraitCatalog.assets.find(asset => asset.id === id)?.skinToneMst)
      }
      const reordered = await app.inject(`${base}&skinTone=7,8`)
      expect(reordered.json()).toEqual(selected.json())
      expect(reordered.headers.etag).toBe(selected.headers.etag)
    } finally { await app.close() }
  })
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
    } finally { await app.close() }
  })
})
