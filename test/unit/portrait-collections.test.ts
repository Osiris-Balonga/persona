import { describe, expect, it } from 'vitest'
import { isPortraitCollection, portraitCollections } from '../../src/review/collections.js'
import { isAppearance } from '../../src/geography/appearance.js'

describe('portrait production collections', () => {
  it('keeps explicit review blocks separate from visual appearance labels', () => {
    expect(portraitCollections.americas).toHaveLength(2)
    expect(portraitCollections.europe).toHaveLength(4)
    expect(portraitCollections.oceania).toHaveLength(2)
    expect(isPortraitCollection('europe-unassigned')).toBe(false)
    expect(isPortraitCollection('north-american')).toBe(false)
  })
  it('accepts a Pacific portrait appearance independently of its production collection', () => {
    expect(isAppearance('pacific-islander')).toBe(true)
    expect(isAppearance('black')).toBe(true)
    expect(isPortraitCollection('pacific-islander')).toBe(false)
  })
})
