import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { portraitCatalog } from '../../src/portraits/manifest.js'
import { selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'

describe('Africa and Asia doctor portrait release', () => {
  it('preserves every previously approved standard rendition', () => {
    const standards = portraitCatalog.assets.filter((asset) => asset.reviewStatus === 'approved'
      && (asset.portraitContext ?? 'standard') === 'standard')
    expect(standards).toHaveLength(1764)
    const delivery = standards.map(({ id, sha256, variants }) => ({ id, sha256, variants }))
    expect(createHash('sha256').update(JSON.stringify(delivery)).digest('hex'))
      .toBe('bbc9f64366143e3f63970eef6b60db609099f7113fbba196e428c0a4ace94ddf')
  })

  it('provides two distinct doctor portraits per gender and age band in each released collection', () => {
    const countries = ['CG', 'KE', 'MG', 'DZ', 'ZA', 'NG', 'KZ', 'CN', 'JO', 'IN', 'TH']
    const ages = [25, 30, 35, 40, 45, 50, 55, 60, 64]
    const doctors = portraitCatalog.assets.filter((asset) => asset.reviewStatus === 'approved'
      && asset.portraitContext === 'doctor')
    expect(doctors).toHaveLength(396)
    for (const country of countries) {
      for (const gender of ['female', 'male'] as const) {
        for (const age of ages) {
          const used = new Set<string>()
          const profile = { age, ageGroup: 'adult' as const, gender }
          const first = selectPortraitFromCollection(portraitCatalog, profile, country, 'a'.repeat(64), used, 'doctor')
          const second = selectPortraitFromCollection(portraitCatalog, profile, country, 'a'.repeat(64), used, 'doctor')
          expect(first, `${country}/${gender}/${age}`).not.toBeNull()
          expect(second).not.toBeNull()
          expect(second).not.toEqual(first)
          expect(used.size).toBe(2)
          for (const id of used) expect(doctors.find((asset) => asset.id === id)?.variants).toBeDefined()
        }
      }
    }
  })
})
