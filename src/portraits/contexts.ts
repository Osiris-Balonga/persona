import type { AgeGroup } from '../age.js'

// Visual production briefs, not assertions about an individual's occupation.
export const portraitContexts = {
  standard: { minimumAge: 6, maximumAge: 100, brief: 'Everyday clothing' },
  doctor: { minimumAge: 25, maximumAge: 64, brief: 'Recognizable medical coat and accessories' },
  construction: { minimumAge: 18, maximumAge: 64, brief: 'Construction safety helmet and workwear' },
  business: { minimumAge: 18, maximumAge: 64, brief: 'Formal business clothing' },
  'school-pupil': { minimumAge: 6, maximumAge: 17, brief: 'School clothing or accessories' },
  'university-student': { minimumAge: 18, maximumAge: 34, brief: 'University study clothing or accessories' },
} as const

export type PortraitContext = keyof typeof portraitContexts
export const portraitContextIds = Object.keys(portraitContexts) as PortraitContext[]
export const portraitSelectionVersion = 'contexts-v1'

export function isPortraitContext(value: unknown): value is PortraitContext {
  return typeof value === 'string' && Object.hasOwn(portraitContexts, value)
}

export function contextAllowsAge(context: PortraitContext, age: number): boolean {
  const { minimumAge, maximumAge } = portraitContexts[context]
  return Number.isInteger(age) && age >= minimumAge && age <= maximumAge
}

export function contextIntersectsRange(context: PortraitContext, minimum: number, maximum: number): boolean {
  const eligibility = portraitContexts[context]
  return minimum <= eligibility.maximumAge && maximum >= eligibility.minimumAge
}

const ageRanges: Record<AgeGroup, readonly [number, number]> = {
  child: [6, 12], teen: [13, 17], adult: [18, 64], senior: [65, 100],
}

export function eligibleContextAges(context: PortraitContext, groups: readonly AgeGroup[] = ['child', 'teen', 'adult', 'senior']): number[] {
  return groups.flatMap(group => {
    const [minimum, maximum] = ageRanges[group]
    return Array.from({ length: maximum - minimum + 1 }, (_, offset) => minimum + offset)
      .filter(age => contextAllowsAge(context, age))
  })
}

export function eligibleSelectedContextAges(contexts: readonly PortraitContext[], groups?: readonly AgeGroup[]): number[] {
  // No pictures selected leaves the ordinary profile age range available.
  if (contexts.length === 0) return eligibleContextAges('standard', groups)
  return [...new Set(contexts.flatMap(context => eligibleContextAges(context, groups)))].sort((a, b) => a - b)
}
