import { describe, expect, it } from 'vitest'
import { approvedPortraitHash, portraitCoverage, portraitCoverageMatrix, selectPortrait, validatePortraitCatalog } from '../../src/portraits/catalog.js'
import { appearanceCategories } from '../../src/geography/appearance.js'

const asset = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  objectKey: `portraits/v1/teen/female/black/west-african/${id}.webp`,
  catalogVersion: 'v1', ageGroup: 'teen' as const, gender: 'female' as const,
  apparentAgeRanges: [[13, 15], [16, 17]],
  visualGroup: 'black', appearance: 'west-african' as const,
  rights: 'project-owned synthetic image', sha256: `${'a'.repeat(63)}${id.slice(-1)}`,
  reviewStatus: 'approved' as const,
  ...overrides,
})

const catalog = (assets: ReturnType<typeof asset>[]) => ({
  version: 'v1', publicBaseUrl: 'https://images.example.test', assets,
})

const profile = { age: 14, ageGroup: 'teen' as const, gender: 'female' as const, appearance: 'west-african' as const }
const key = '0123456789abcdef'.repeat(4)

describe('approved portrait catalog', () => {
  it('selects only a compatible approved ID and avoids repeats while candidates remain', () => {
    const manifest = catalog([asset('p_0001'), asset('p_0002'), asset('p_0003', {
      gender: 'male', objectKey: 'portraits/v1/teen/male/black/west-african/p_0003.webp',
    }),
      asset('p_0004', { reviewStatus: 'withdrawn' })])
    expect(validatePortraitCatalog(manifest)).toEqual([])
    const used = new Set<string>()
    const first = selectPortrait(manifest, profile, key, used)
    const second = selectPortrait(manifest, profile, key, used)
    expect(first?.url).toMatch(/^https:\/\/images\.example\.test\/portraits\/v1\/teen\/female\/black\/west-african\/p_000[12]\.webp$/)
    expect(second?.url).not.toBe(first?.url)
    expect(selectPortrait(manifest, { ...profile, appearance: 'east-asian' }, key)).toBeNull()
    expect(selectPortrait(manifest, profile, key)).toEqual(first)
  })

  it('reports groups below the minimum of two approved candidates', () => {
    const one = catalog([asset('p_0001')])
    expect(portraitCoverage(one, profile)).toEqual({ approved: 1, minimum: 2, ready: false })
    expect(portraitCoverage(catalog([asset('p_0001'), asset('p_0002')]), profile).ready).toBe(true)
    const rows = portraitCoverageMatrix(catalog([asset('p_0001'), asset('p_0002')]))
    expect(rows).toHaveLength(4 * 2 * appearanceCategories.length)
    expect(rows.filter((row) => row.ready)).toEqual([{ ageGroup: profile.ageGroup, gender: profile.gender,
      appearance: profile.appearance, approved: 2, minimum: 2, ready: true }])
  })

  it('rejects duplicate IDs, hashes, and mismatched object keys', () => {
    const invalid = catalog([asset('p_0001'), asset('p_0001', { objectKey: 'portraits/v1/adult/female/black/west-african/p_0001.webp' })])
    expect(validatePortraitCatalog(invalid).length).toBeGreaterThan(0)
  })

  it('uses one canonical large object for the source and public large rendition', () => {
    const portrait = asset('p_0001', {
      objectKey: 'portraits/v1/large/p_0001.webp',
      variants: {
        large: { objectKey: 'portraits/v1/large/p_0001.webp', sha256: `${'a'.repeat(63)}1` },
        medium: { objectKey: 'portraits/v1/medium/p_0001.webp', sha256: 'b'.repeat(64) },
        thumbnail: { objectKey: 'portraits/v1/thumbnail/p_0001.webp', sha256: 'c'.repeat(64) },
      },
    })
    const manifest = catalog([portrait])
    expect(validatePortraitCatalog(manifest)).toEqual([])
    expect(approvedPortraitHash(manifest, 'portraits/v1/large/p_0001.webp')).toBe(`${'a'.repeat(63)}1`)
    expect(approvedPortraitHash(manifest, 'portraits/v1/p_0001.webp')).toBeUndefined()
  })

  it('matches either reviewed age band, including a neighboring adult band', () => {
    const portrait = asset('p_0001', { apparentAgeRanges: [[16, 17], [18, 22], [23, 27]] })
    const manifest = catalog([portrait])
    expect(validatePortraitCatalog(manifest)).toEqual([])
    expect(selectPortrait(manifest, { ...profile, age: 17 }, key)).not.toBeNull()
    expect(selectPortrait(manifest, { ...profile, age: 19, ageGroup: 'adult' }, key)).not.toBeNull()
    expect(selectPortrait(manifest, { ...profile, age: 23, ageGroup: 'adult' }, key)).not.toBeNull()
    expect(selectPortrait(manifest, { ...profile, age: 28, ageGroup: 'adult' }, key)).toBeNull()
    expect(validatePortraitCatalog(catalog([asset('p_0001', { apparentAgeRanges: [[13, 15], [23, 27]] })])).length)
      .toBeGreaterThan(0)
  })

  it('reuses one reviewed portrait across compatible appearance pools without duplicating the object', () => {
    const portrait = asset('p_0001', {
      objectKey: 'portraits/v1/p_0001.webp',
      compatibleAppearances: ['west-african', 'black'], skinToneMst: 6,
    })
    const manifest = catalog([portrait])
    expect(validatePortraitCatalog(manifest)).toEqual([])
    expect(selectPortrait(manifest, { ...profile, appearance: 'black' }, key)?.url)
      .toBe('https://images.example.test/portraits/v1/p_0001.webp')
    expect(validatePortraitCatalog(catalog([asset('p_0001', {
      objectKey: 'portraits/v1/p_0001.webp', compatibleAppearances: ['black', 'black'],
    })])).length).toBeGreaterThan(0)
  })

  it('matches reviewed visual tags independently of the production region', () => {
    const portrait = asset('p_0001', {
      objectKey: 'portraits/v1/p_0001.webp', appearanceTags: ['black', 'indigenous-american'],
    })
    const manifest = catalog([portrait])
    expect(validatePortraitCatalog(manifest)).toEqual([])
    expect(selectPortrait(manifest, { ...profile, appearance: 'central-african' }, key)?.url)
      .toBe('https://images.example.test/portraits/v1/p_0001.webp')
    expect(selectPortrait(manifest, { ...profile, appearance: 'latin-american' }, key)?.url)
      .toBe('https://images.example.test/portraits/v1/p_0001.webp')
    expect(selectPortrait(manifest, { ...profile, appearance: 'mixed' }, key)).toBeNull()
    expect(selectPortrait(manifest, { ...profile, appearance: 'european' }, key)).toBeNull()
    expect(validatePortraitCatalog(catalog([asset('p_0001', { appearanceTags: ['black', 'black'] })])).length)
      .toBeGreaterThan(0)
    const mixed = catalog([asset('p_0002', {
      objectKey: 'portraits/v1/p_0002.webp', appearance: 'mixed',
      visualGroup: 'mixed', appearanceTags: ['black', 'european'],
    })])
    expect(selectPortrait(mixed, { ...profile, appearance: 'mixed' }, key)).not.toBeNull()
  })

  it('publishes only reviewed portraits in the production manifest', async () => {
    const { portraitCatalog } = await import('../../src/portraits/manifest.js')
    expect(portraitCatalog.version).toBe('v1')
    expect(portraitCatalog.assets).toHaveLength(2448)
    expect(portraitCatalog.assets.every((entry) => entry.collection)).toBe(true)
    expect(portraitCatalog.assets.every((entry) => entry.reviewStatus === 'approved')).toBe(true)
    expect(portraitCatalog.assets.every((entry) => entry.objectKey === entry.variants?.large.objectKey)).toBe(true)
    expect(validatePortraitCatalog(portraitCatalog)).toEqual([])
  })
})
