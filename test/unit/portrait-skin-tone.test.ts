import { describe, expect, it } from 'vitest'
import { parsePeopleQuery } from '../../src/people-query.js'
import { createGenerationContext, responseETag } from '../../src/replay.js'
import { selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'
import type { PortraitAsset, PortraitCatalog } from '../../src/portraits/catalog.js'

const asset: PortraitAsset = {
  id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
  collection: 'africa-central', ageGroup: 'adult', apparentAgeRanges: [[28, 32]], gender: 'female',
  visualGroup: 'black', appearance: 'central-african', appearanceTags: ['black'],
  rights: 'Fictional portrait fixture', sha256: 'a'.repeat(64), reviewStatus: 'approved',
}
const catalog: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [
  asset, { ...asset, id: 'p_0002', objectKey: 'portraits/v1/p_0002.webp', skinToneMst: 6 },
  { ...asset, id: 'p_0003', objectKey: 'portraits/v1/p_0003.webp', skinToneMst: 8 },
] }
const profile = { age: 30, ageGroup: 'adult' as const, gender: 'female' as const }
const key = '0'.repeat(64)
const parse = (query: string) => parsePeopleQuery(new URLSearchParams(query))

describe('editorial portrait skin tone filter', () => {
  it('accepts only integer Monk scale values 1–10 and omission leaves the filter absent', () => {
    expect(parse('skinTone=')).toHaveProperty('skinTone', [])
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, undefined, 'standard', [])).toBeNull()
    expect(parse('skinTone=1')).toHaveProperty('skinTone', 1)
    expect(parse('skinTone=10')).toHaveProperty('skinTone', 10)
    expect(parse('')).not.toHaveProperty('skinTone')
    for (const value of ['0', '11', '1.5', '01', '6,6', '6,11', '6,', 'dark']) {
      expect(() => parse(`skinTone=${value}`)).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'skinTone' }))
    }
  })

  it('normalizes distinct tone lists and selects their union without unannotated fallback', () => {
    expect(parse('skinTone=8,6').skinTone).toEqual([6, 8])
    const used = new Set<string>()
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, used, 'standard', [6, 8])?.url).toContain('p_0002')
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, used, 'standard', [6, 8])?.url).toContain('p_0003')
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, undefined, 'standard', [1, 2])).toBeNull()
    const versions = { dataVersion: 'geo-v1', catalogVersion: 'portraits-v1' }
    const first = parse('seed=tone-demo&skinTone=8,6')
    const reordered = parse('seed=tone-demo&skinTone=6,8')
    expect(responseETag(first, versions)).toBe(responseETag(reordered, versions))
  })

  it('selects the requested annotation and never substitutes an unannotated or different tone', () => {
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, undefined, 'standard', 6)?.url).toContain('p_0002')
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, undefined, 'standard', 8)?.url).toContain('p_0003')
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, undefined, 'standard', 5)).toBeNull()
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key)?.url).toContain('p_0001')
    expect(selectPortraitFromCollection(catalog, profile, 'CG', key, undefined, [], 6)).toBeNull()
  })

  it('searches all collections for an explicit tone, even when a local match exists', () => {
    const globalCatalog: PortraitCatalog = { ...catalog, assets: [
      { ...asset, id: 'p_0004', objectKey: 'portraits/v1/p_0004.webp', collection: 'europe-west', skinToneMst: 6 },
      catalog.assets[1],
    ] }
    expect(selectPortraitFromCollection(globalCatalog, profile, 'CG', key)?.url).toContain('p_0002')
    expect(selectPortraitFromCollection(globalCatalog, profile, 'SN', key)).toBeNull()
    for (const country of ['CG', 'SN', 'AQ']) {
      expect(selectPortraitFromCollection(globalCatalog, profile, country, key, undefined, 'standard', 6)?.url).toContain('p_0004')
    }
    const used = new Set<string>()
    expect(selectPortraitFromCollection(globalCatalog, profile, 'CG', key, used, 'standard', [6])?.url).toContain('p_0004')
    expect(selectPortraitFromCollection(globalCatalog, profile, 'CG', key, used, 'standard', [6])?.url).toContain('p_0002')
    expect(selectPortraitFromCollection(globalCatalog, profile, 'CG', key, used, 'standard', [6])?.url).toContain('p_0004')
  })

  it('keeps gender, reviewed age, context and approval requirements when searching globally', () => {
    const foreign = { ...catalog.assets[1], collection: 'europe-west' as const }
    const incompatible: PortraitCatalog = { ...catalog, assets: [
      { ...foreign, gender: 'male' },
      { ...foreign, apparentAgeRanges: [[33, 37]] },
      { ...foreign, portraitContext: 'construction' },
      { ...foreign, reviewStatus: 'rejected' },
      { ...foreign, reviewStatus: 'withdrawn' },
      { ...foreign, skinToneMst: undefined },
      { ...foreign, skinToneMst: 8 },
    ] }
    expect(selectPortraitFromCollection(incompatible, profile, 'CG', key, undefined, 'standard', 6)).toBeNull()
    expect(selectPortraitFromCollection({ ...incompatible, assets: [...incompatible.assets, foreign] },
      profile, 'CG', key, undefined, 'standard', 6)?.url).toContain('p_0002')
  })

  it('scopes the tone to portrait replay and its validator without changing generated identity or age', () => {
    const versions = { dataVersion: 'geo-v1', catalogVersion: 'portraits-v1' }
    const base = parse('seed=tone-demo&asOf=2026-10-11')
    const filtered = parse('seed=tone-demo&asOf=2026-10-11&skinTone=6')
    const original = createGenerationContext(base, versions)
    const selected = createGenerationContext(filtered, versions)
    for (const component of ['identity', 'age', 'nationality', 'name', 'city']) {
      expect(selected.componentKey(0, component)).toBe(original.componentKey(0, component))
    }
    expect(selected.componentKey(0, 'portrait')).not.toBe(original.componentKey(0, 'portrait'))
    expect(responseETag(filtered, versions)).not.toBe(responseETag(base, versions))
  })
})
