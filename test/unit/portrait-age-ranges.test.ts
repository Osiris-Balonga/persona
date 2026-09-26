import { describe, expect, it } from 'vitest'
import { portraitAgeRanges, closestPortraitAgeRange } from '../../src/review/age-ranges.js'

describe('portrait age choices', () => {
  it('uses five-year bands within Persona age groups, including the upper senior ages', () => {
    expect(portraitAgeRanges.child).toEqual([[6, 10], [11, 12]])
    expect(portraitAgeRanges.teen).toEqual([[13, 17]])
    expect(portraitAgeRanges.adult.slice(0, 3)).toEqual([[18, 22], [23, 27], [28, 32]])
    expect(portraitAgeRanges.adult.at(-1)).toEqual([63, 64])
    expect(portraitAgeRanges.senior.slice(0, 2)).toEqual([[65, 69], [70, 74]])
    expect(portraitAgeRanges.senior.at(-1)).toEqual([100, 100])
  })

  it('maps an existing age estimate to one offered band', () => {
    expect(closestPortraitAgeRange('adult', 26, 34)).toEqual([28, 32])
    expect(closestPortraitAgeRange('senior', 73, 83)).toEqual([75, 79])
  })
})
