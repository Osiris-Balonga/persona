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
})
