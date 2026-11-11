import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { portraitCatalog } from '../../src/portraits/manifest.js'
import { selectPortraitFromCollection } from '../../src/portraits/collection-selection.js'
import { ageGroupForAge } from '../../src/age.js'

describe('school pupil portrait release', () => {
  it('preserves all previously released portraits and their rendition hashes', () => {
    const previous = portraitCatalog.assets.filter(asset => Number(asset.id.slice(2)) <= 3971)
    expect(previous).toHaveLength(3968)
    const delivery = previous.map(({ id, sha256, variants }) => ({ id, sha256, variants }))
    expect(createHash('sha256').update(JSON.stringify(delivery)).digest('hex'))
      .toBe('019d06d6ee3309506e975051ab3e851893d8183025868dffa4c00870d2026040')
  })

  it('offers two different pupil portraits per gender at every eligible age in all collections', () => {
    const pupils = portraitCatalog.assets.filter(asset => asset.portraitContext === 'school-pupil')
    expect(pupils).toHaveLength(304)
    for (const country of ['CG', 'KE', 'MG', 'DZ', 'ZA', 'NG', 'KZ', 'CN', 'JO', 'IN', 'TH',
      'US', 'BR', 'NO', 'FR', 'IT', 'PL', 'AU', 'FJ']) {
      for (const gender of ['female', 'male'] as const) {
        for (let age = 6; age <= 17; age++) {
          const used = new Set<string>()
          const profile = { age, ageGroup: ageGroupForAge(age), gender }
          const first = selectPortraitFromCollection(portraitCatalog, profile, country, 'd'.repeat(64), used, 'school-pupil')
          const second = selectPortraitFromCollection(portraitCatalog, profile, country, 'd'.repeat(64), used, 'school-pupil')
          expect(first, `${country}/${gender}/${age}`).not.toBeNull()
          expect(second).not.toBeNull()
          expect(second).not.toEqual(first)
          expect(used.size).toBe(2)
          for (const id of used) {
            const asset = pupils.find(item => item.id === id)
            expect(asset?.variants?.large).toBeDefined()
            expect(asset?.variants?.medium).toBeDefined()
            expect(asset?.variants?.thumbnail).toBeDefined()
          }
        }
        expect(selectPortraitFromCollection(portraitCatalog,
          { age: 18, ageGroup: 'adult', gender }, country, 'd'.repeat(64), undefined, 'school-pupil')).toBeNull()
      }
    }
  })
})
