import { describe, expect, it } from 'vitest'
import { collectionForCountry, selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'
import type { PortraitAsset, PortraitCatalog } from '../../src/portraits/catalog.js'

const key = '0123456789abcdef'.repeat(4)
const base: PortraitAsset = {
  id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
  ageGroup: 'adult', apparentAgeRanges: [[28, 32]], gender: 'female',
  visualGroup: 'black', appearance: 'central-african', appearanceTags: ['black'],
  rights: 'Synthetic portrait generated for Persona', sha256: 'a'.repeat(64), reviewStatus: 'approved',
}
const catalog = (assets: PortraitAsset[]): PortraitCatalog => ({
  version: 'v1', publicBaseUrl: 'https://images.example.test', assets,
})
const profile = { age: 30, ageGroup: 'adult' as const, gender: 'female' as const, appearance: 'black' as const }

describe('collection-only portrait experiment', () => {
  it('maps countries to their production collection, including African islands', () => {
    expect(collectionForCountry('CG')).toBe('africa-central')
    expect(collectionForCountry('CD')).toBe('africa-central')
    expect(collectionForCountry('SN')).toBe('africa-west')
    expect(collectionForCountry('RW')).toBe('africa-east')
    expect(collectionForCountry('MG')).toBe('africa-indian-ocean')
    expect(collectionForCountry('DZ')).toBe('africa-north')
    expect(collectionForCountry('MA')).toBe('africa-north')
    expect(collectionForCountry('FR')).toBe('europe-west')
    expect(collectionForCountry('US')).toBe('americas-north')
    expect(collectionForCountry('AU')).toBe('oceania-australia-new-zealand')
    expect(collectionForCountry('KZ')).toBe('asia-central')
    expect(collectionForCountry('KG')).toBe('asia-central')
    expect(collectionForCountry('UZ')).toBe('asia-central')
  })

  it('selects only approved portraits from the country collection, regardless of visual tags', () => {
    const assets = [
      { ...base, collection: 'africa-central' as const },
      { ...base, id: 'p_0002', objectKey: 'portraits/v1/p_0002.webp', collection: 'africa-east' as const },
      { ...base, id: 'p_0003', objectKey: 'portraits/v1/p_0003.webp', collection: 'africa-central' as const,
        reviewStatus: 'withdrawn' as const },
    ]
    expect(selectPortraitFromCollection(catalog(assets), profile, 'CG', key)?.url)
      .toBe('https://images.example.test/portraits/v1/p_0001.webp')
    expect(selectPortraitFromCollection(catalog(assets), profile, 'RW', key)?.url)
      .toBe('https://images.example.test/portraits/v1/p_0002.webp')
  })

  it('returns no portrait when collection, age, or gender has no match', () => {
    const portraits = catalog([{ ...base, collection: 'africa-central' }])
    expect(selectPortraitFromCollection(portraits, profile, 'SN', key)).toBeNull()
    expect(selectPortraitFromCollection(portraits, { ...profile, age: 36 }, 'CG', key)).toBeNull()
    expect(selectPortraitFromCollection(portraits, { ...profile, gender: 'male' }, 'CG', key)).toBeNull()
  })

  it('draws an available context by fixed weights, independently from its asset draw', () => {
    const assets = [
      { ...base, id: 'p_std', objectKey: 'portraits/v1/p_std.webp', portraitContext: 'standard' as const, collection: 'africa-central' as const },
      { ...base, id: 'p_doc', objectKey: 'portraits/v1/p_doc.webp', portraitContext: 'doctor' as const, collection: 'africa-central' as const },
      { ...base, id: 'p_biz', objectKey: 'portraits/v1/p_biz.webp', portraitContext: 'business' as const, collection: 'africa-central' as const },
    ]
    const multi = (draw: number, assetDraw = 0) => `${assetDraw.toString(16).padStart(12, '0')}${draw.toString(16).padStart(12, '0')}${'0'.repeat(40)}`
    const requested = ['standard', 'doctor', 'business'] as const
    expect(selectPortraitFromCollection(catalog(assets), profile, 'CG', multi(0), undefined, requested)?.url).toContain('p_std')
    // Weights are renormalized over available contexts: total 80, intervals 50/5/25.
    expect(selectPortraitFromCollection(catalog(assets), profile, 'CG', multi(50), undefined, requested)?.url).toContain('p_doc')
    expect(selectPortraitFromCollection(catalog(assets), profile, 'CG', multi(55), undefined, requested)?.url).toContain('p_biz')
    expect(selectPortraitFromCollection(catalog(assets), profile, 'CG', multi(0, 1), undefined, requested)?.url).toContain('p_std')
  })

  it('keeps normalized context frequencies independent of catalogue counts and age exclusions', () => {
    const standard = { ...base, id: 'p_std', objectKey: 'portraits/v1/p_std.webp', collection: 'africa-central' as const }
    const business = Array.from({ length: 9 }, (_, index) => ({
      ...base, id: `p_biz${index}`, objectKey: `portraits/v1/p_biz${index}.webp`,
      portraitContext: 'business' as const, collection: 'africa-central' as const,
    }))
    const doctors = [{ ...base, id: 'p_doc', objectKey: 'portraits/v1/p_doc.webp', portraitContext: 'doctor' as const, collection: 'africa-central' as const }]
    const construction = [{ ...base, id: 'p_con', objectKey: 'portraits/v1/p_con.webp', portraitContext: 'construction' as const, collection: 'africa-central' as const }]
    const assets = [standard, ...business, ...doctors, ...construction]
    const contexts = ['standard', 'business', 'doctor', 'construction'] as const
    const counts = new Map<string, number>()
    for (let draw = 0; draw < 85; draw++) {
      const contextDrawKey = `${'0'.repeat(12)}${draw.toString(16).padStart(12, '0')}${'0'.repeat(40)}`
      const url = selectPortraitFromCollection(catalog(assets), profile, 'CG', contextDrawKey, undefined, contexts)?.url
      const match = assets.find(asset => url?.endsWith(asset.objectKey))
      const context = match?.portraitContext ?? 'standard'
      counts.set(context, (counts.get(context) ?? 0) + 1)
    }
    expect(Object.fromEntries(counts)).toEqual({ standard: 50, business: 25, doctor: 5, construction: 5 })

    const childPortrait = { ...base, id: 'p_pupil', objectKey: 'portraits/v1/p_pupil.webp', ageGroup: 'child' as const,
      apparentAgeRanges: [[8, 12] as [number, number]], portraitContext: 'school-pupil' as const, collection: 'africa-central' as const }
    const adultContexts = ['standard', 'school-pupil'] as const
    const adultKey = `${'0'.repeat(24)}${'0'.repeat(40)}`
    expect(selectPortraitFromCollection(catalog([standard, childPortrait]), profile, 'CG', adultKey, undefined, adultContexts)?.url)
      .toContain('p_std')
    const seniorPortrait = { ...base, id: 'p_senior', objectKey: 'portraits/v1/p_senior.webp', ageGroup: 'senior' as const,
      apparentAgeRanges: [[65, 69] as [number, number]], collection: 'africa-central' as const }
    expect(selectPortraitFromCollection(catalog([seniorPortrait, ...doctors]), { ...profile, age: 67, ageGroup: 'senior' },
      'CG', adultKey, undefined, ['standard', 'doctor'])?.url).toContain('p_senior')
  })

  it('does not shift context weights when the chosen context has no unused assets', () => {
    const assets = [
      { ...base, id: 'p_std', objectKey: 'portraits/v1/p_std.webp', collection: 'africa-central' as const },
      { ...base, id: 'p_doc', objectKey: 'portraits/v1/p_doc.webp', portraitContext: 'doctor' as const, collection: 'africa-central' as const },
    ]
    const used = new Set(['p_std'])
    const drawStandard = `${'0'.repeat(12)}${'0'.repeat(12)}${'0'.repeat(40)}`
    expect(selectPortraitFromCollection(catalog(assets), profile, 'CG', drawStandard, used, ['standard', 'doctor'])?.url).toContain('p_std')
  })
})
