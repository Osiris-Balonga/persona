import { describe, expect, it } from 'vitest'
import { portraitAgeRanges, closestPortraitAgeRange, adjacentPortraitAgeRanges,
  areConsecutivePortraitAgeRanges } from '../../src/review/age-ranges.js'

describe('portrait age choices', () => {
  it('uses shorter age bands for children and teens, then five-year adult bands', () => {
    expect(portraitAgeRanges.child).toEqual([[6, 8], [9, 12]])
    expect(portraitAgeRanges.teen).toEqual([[13, 15], [16, 17]])
    expect(portraitAgeRanges.adult.slice(0, 3)).toEqual([[18, 22], [23, 27], [28, 32]])
    expect(portraitAgeRanges.adult.at(-1)).toEqual([63, 64])
    expect(portraitAgeRanges.senior.slice(0, 2)).toEqual([[65, 69], [70, 74]])
    expect(portraitAgeRanges.senior.at(-1)).toEqual([100, 100])
  })

  it('maps an existing age estimate to one offered band', () => {
    expect(closestPortraitAgeRange('child', 7, 10)).toEqual([6, 8])
    expect(closestPortraitAgeRange('child', 9, 12)).toEqual([9, 12])
    expect(closestPortraitAgeRange('teen', 14, 16)).toEqual([13, 15])
    expect(closestPortraitAgeRange('teen', 15, 17)).toEqual([16, 17])
    expect(closestPortraitAgeRange('adult', 26, 34)).toEqual([28, 32])
    expect(closestPortraitAgeRange('senior', 73, 83)).toEqual([75, 79])
  })

  it('offers only the two immediate neighboring bands, including category boundaries', () => {
    expect(adjacentPortraitAgeRanges(28, 32)).toEqual([[23, 27], [33, 37]])
    expect(adjacentPortraitAgeRanges(16, 17)).toEqual([[13, 15], [18, 22]])
    expect(adjacentPortraitAgeRanges(6, 8)).toEqual([[9, 12]])
  })

  it('accepts any number of ordered consecutive bands, including category boundaries', () => {
    expect(areConsecutivePortraitAgeRanges([[13, 15], [16, 17], [18, 22], [23, 27]])).toBe(true)
    expect(areConsecutivePortraitAgeRanges([[13, 15], [18, 22]])).toBe(false)
    expect(areConsecutivePortraitAgeRanges([[16, 17], [13, 15]])).toBe(false)
    expect(areConsecutivePortraitAgeRanges([])).toBe(false)
  })
})
