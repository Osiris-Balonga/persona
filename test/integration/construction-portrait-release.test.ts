import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { portraitCatalog } from '../../src/portraits/manifest.js'
import { selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'

describe('construction portrait release', () => {
  it('preserves every previously released standard and doctor rendition', () => {
    const previous = portraitCatalog.assets.filter(asset => asset.portraitContext !== 'construction')
    expect(previous).toHaveLength(2448)
    const delivery = previous.map(({ id, sha256, variants }) => ({ id, sha256, variants }))
    expect(createHash('sha256').update(JSON.stringify(delivery)).digest('hex'))
      .toBe('437de6f8aa4c2c2d5746b74cfa430de0d7267ab22854ccd70a5835ee1b1f8d81')
  })
  it('serves two different construction portraits per gender and adult age band across every collection', () => {
    const portraits = portraitCatalog.assets.filter(asset => asset.portraitContext === 'construction')
    expect(portraits).toHaveLength(760)
    for (const country of ['CG', 'KE', 'MG', 'DZ', 'ZA', 'NG', 'KZ', 'CN', 'JO', 'IN', 'TH',
      'US', 'BR', 'NO', 'FR', 'IT', 'PL', 'AU', 'FJ']) {
      for (const gender of ['female', 'male'] as const) {
        for (const age of [18, 25, 30, 35, 40, 45, 50, 55, 60, 64]) {
          const used = new Set<string>()
          const profile = { age, ageGroup: 'adult' as const, gender }
          const first = selectPortraitFromCollection(portraitCatalog, profile, country, 'b'.repeat(64), used, 'construction')
          const second = selectPortraitFromCollection(portraitCatalog, profile, country, 'b'.repeat(64), used, 'construction')
          expect(first, `${country}/${gender}/${age}`).not.toBeNull()
          expect(second).not.toBeNull()
          expect(second).not.toEqual(first)
          expect(used.size).toBe(2)
          for (const id of used) expect(portraits.find(asset => asset.id === id)?.variants).toBeDefined()
        }
      }
    }
  })
})
