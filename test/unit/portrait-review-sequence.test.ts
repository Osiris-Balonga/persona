import { describe, expect, it } from 'vitest'
import { eligibleReviewIds, nextPendingIndex, selectableAgeIndexes } from '../../review/review-sequence.js'

describe('sequential portrait review', () => {
  it('keeps only ready portraits matching the current gallery filters', () => {
    const portraits = [
      { id: 'p_0033', status: 'ready-for-review', metadata: { appearance: 'north-african', gender: 'female', apparentAgeRanges: [[28, 32]] } },
      { id: 'p_0034', status: 'approved', metadata: { appearance: 'north-african', gender: 'female', apparentAgeRanges: [[28, 32]] } },
      { id: 'p_0035', status: 'ready-for-review', metadata: { appearance: 'west-african', gender: 'female', apparentAgeRanges: [[28, 32]] } },
    ]
    expect(eligibleReviewIds(portraits, {
      status: 'approved', appearance: 'north-african', ageGroup: 'all', ageRange: 'all', gender: 'female', quality: 'all',
    })).toEqual(['p_0033'])
  })

  it('offers only selected endpoints and adjacent bands while preserving consecutive selection', () => {
    const ranges = [[18, 22], [23, 27], [28, 32], [33, 37], [38, 42]]
    expect(selectableAgeIndexes(ranges, [[23, 27], [28, 32], [33, 37]])).toEqual([0, 1, 3, 4])
    expect(selectableAgeIndexes(ranges, [])).toEqual([0, 1, 2, 3, 4])
  })

  it('continues with the next pending portrait, then wraps to skipped portraits', () => {
    const ids = ['p_0033', 'p_0034', 'p_0035']
    const items = [
      { id: 'p_0033', status: 'ready-for-review' },
      { id: 'p_0034', status: 'approved' },
      { id: 'p_0035', status: 'ready-for-review' },
    ]
    expect(nextPendingIndex(ids, items, 1)).toBe(2)
    expect(nextPendingIndex(ids, items, 2)).toBe(0)
    expect(nextPendingIndex(ids, items.map((item) => ({ ...item, status: 'approved' })), 2)).toBe(3)
  })
})
