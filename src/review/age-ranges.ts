import type { AgeGroup } from '../age.js'

type AgeRange = readonly [number, number]
const groupBounds: Record<AgeGroup, AgeRange> = {
  child: [6, 12], teen: [13, 17], adult: [18, 64], senior: [65, 100],
}

function bands(minimum: number, maximum: number): AgeRange[] {
  const result: AgeRange[] = []
  for (let first = minimum; first <= maximum; first += 5) {
    result.push([first, Math.min(first + 4, maximum)])
  }
  return result
}

export const portraitAgeRanges: Record<AgeGroup, readonly AgeRange[]> = {
  child: [[6, 8], [9, 12]], teen: [[13, 15], [16, 17]],
  adult: bands(...groupBounds.adult), senior: bands(...groupBounds.senior),
}

const orderedAgeRanges = Object.values(portraitAgeRanges).flat()

export function areConsecutivePortraitAgeRanges(value: unknown): value is AgeRange[] {
  if (!Array.isArray(value) || value.length === 0) return false
  let previous = -1
  for (const range of value) {
    if (!Array.isArray(range) || range.length !== 2) return false
    const index = orderedAgeRanges.findIndex(([min, max]) => min === range[0] && max === range[1])
    if (index < 0 || (previous >= 0 && index !== previous + 1)) return false
    previous = index
  }
  return true
}

export function adjacentPortraitAgeRanges(minimum: number, maximum: number): AgeRange[] {
  const index = orderedAgeRanges.findIndex(([first, last]) => first === minimum && last === maximum)
  if (index < 0) return []
  return [orderedAgeRanges[index - 1], orderedAgeRanges[index + 1]].filter((range): range is AgeRange => range !== undefined)
}

export function isAdjacentPortraitAgeRange(primaryMin: number, primaryMax: number, secondaryMin: number, secondaryMax: number): boolean {
  return adjacentPortraitAgeRanges(primaryMin, primaryMax)
    .some(([first, last]) => first === secondaryMin && last === secondaryMax)
}

export function isPortraitAgeRange(group: AgeGroup, minimum: number, maximum: number): boolean {
  return portraitAgeRanges[group]?.some(([first, last]) => first === minimum && last === maximum) ?? false
}

export function closestPortraitAgeRange(group: AgeGroup, minimum: number, maximum: number): AgeRange {
  const midpoint = (minimum + maximum) / 2
  const choices = portraitAgeRanges[group]
  if (!choices?.length) throw new RangeError('Invalid age group')
  return choices.reduce((best, current) => Math.abs((current[0] + current[1]) / 2 - midpoint)
    < Math.abs((best[0] + best[1]) / 2 - midpoint) ? current : best)
}
