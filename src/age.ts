import type { Person } from './contracts/person.js'

export type AgeGroup = Person['ageGroup']

const ageGroups: readonly AgeGroup[] = ['child', 'teen', 'adult', 'senior']

function calendarDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    throw new RangeError(`Invalid ${label}`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`Invalid ${label}`)
  }

  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

export function ageGroupForAge(age: number): AgeGroup {
  if (!Number.isSafeInteger(age) || age < 0) {
    throw new RangeError('Invalid age')
  }
  if (age <= 12) return 'child'
  if (age <= 17) return 'teen'
  if (age <= 64) return 'adult'
  return 'senior'
}

export function resolveAgeConstraint(input: { age?: number; ageGroup?: AgeGroup }) {
  if (input.ageGroup !== undefined && !ageGroups.includes(input.ageGroup)) {
    throw new RangeError('Invalid ageGroup')
  }
  if (input.age === undefined) {
    return input.ageGroup === undefined ? {} : { ageGroup: input.ageGroup }
  }

  const derivedGroup = ageGroupForAge(input.age)
  if (input.ageGroup !== undefined && input.ageGroup !== derivedGroup) {
    throw new RangeError('age and ageGroup disagree')
  }
  return { age: input.age, ageGroup: derivedGroup }
}

export function resolveAsOf(asOf?: string, now: Date = new Date()): string {
  const value = asOf ?? now.toISOString().slice(0, 10)
  calendarDate(value, 'asOf')
  return value
}

export function ageOn(dateOfBirth: string, asOf: string): number {
  const birth = calendarDate(dateOfBirth, 'dateOfBirth')
  const reference = calendarDate(asOf, 'asOf')
  if (dateOfBirth > asOf) {
    throw new RangeError('dateOfBirth is after asOf')
  }

  const birthdayPassed = reference.month > birth.month ||
    (reference.month === birth.month && reference.day >= birth.day)
  return reference.year - birth.year - (birthdayPassed ? 0 : 1)
}

export function isAgeProfileConsistent(
  profile: Pick<Person, 'age' | 'ageGroup' | 'dateOfBirth'>,
  asOf: string,
): boolean {
  return ageOn(profile.dateOfBirth, asOf) === profile.age &&
    ageGroupForAge(profile.age) === profile.ageGroup
}
