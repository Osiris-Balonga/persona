import { describe, expect, it } from 'vitest'
import { isPortraitCollection, portraitCollections } from '../../src/review/collections.js'

describe('portrait production collections', () => {
  it('keeps explicit review blocks separate from visual appearance labels', () => {
    expect(portraitCollections.americas).toHaveLength(2)
    expect(portraitCollections.europe).toHaveLength(4)
    expect(portraitCollections.oceania).toHaveLength(2)
    expect(isPortraitCollection('europe-unassigned')).toBe(true)
    expect(isPortraitCollection('north-american')).toBe(false)
  })
})
