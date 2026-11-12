import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { portraitCatalog } from '../../src/portraits/manifest.js'
import { selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'

describe('business portrait release', () => {
  it('preserves every previously released portrait rendition', () => {
    const previous = portraitCatalog.assets.filter(asset => Number(asset.id.slice(2)) <= 3211)
    expect(previous).toHaveLength(3208)
    const delivery = previous.map(({ id, sha256, variants }) => ({ id, sha256, variants }))
    expect(createHash('sha256').update(JSON.stringify(delivery)).digest('hex'))
      .toBe('dc768b25a506ee0c325b40a3b043a5755f3ba05aa8f0a9de61afd5746335f9f6')
  })

  it('serves two different business portraits per gender and eligible age band in every collection', () => {
    const portraits = portraitCatalog.assets.filter(asset => asset.portraitContext === 'business')
    expect(portraits).toHaveLength(760)
    for (const country of ['CG', 'KE', 'MG', 'DZ', 'ZA', 'NG', 'KZ', 'CN', 'JO', 'IN', 'TH',
      'US', 'BR', 'NO', 'FR', 'IT', 'PL', 'AU', 'FJ']) {
      for (const gender of ['female', 'male'] as const) {
        for (const age of [18, 25, 30, 35, 40, 45, 50, 55, 60, 64]) {
          const used = new Set<string>()
          const profile = { age, ageGroup: 'adult' as const, gender }
          const first = selectPortraitFromCollection(portraitCatalog, profile, country, 'c'.repeat(64), used, 'business')
          const second = selectPortraitFromCollection(portraitCatalog, profile, country, 'c'.repeat(64), used, 'business')
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
