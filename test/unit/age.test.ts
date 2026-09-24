import { describe, expect, it } from 'vitest'
import {
  ageGroupForAge,
  ageOn,
  isAgeProfileConsistent,
  resolveAgeConstraint,
  resolveAsOf,
} from '../../src/age.js'

describe('age and reference date', () => {
  it('assigns each age at the V1 group boundaries', () => {
    expect([
      ageGroupForAge(12),
      ageGroupForAge(13),
      ageGroupForAge(17),
      ageGroupForAge(18),
      ageGroupForAge(64),
      ageGroupForAge(65),
    ]).toEqual(['child', 'teen', 'teen', 'adult', 'adult', 'senior'])
  })

  it('rejects ages that are negative or not integers', () => {
    expect(() => ageGroupForAge(-1)).toThrow('Invalid age')
    expect(() => ageGroupForAge(14.5)).toThrow('Invalid age')
  })

  it('derives the group for a numeric filter and rejects a conflicting group', () => {
    expect(resolveAgeConstraint({ age: 14 })).toEqual({ age: 14, ageGroup: 'teen' })
    expect(resolveAgeConstraint({ ageGroup: 'teen' })).toEqual({ ageGroup: 'teen' })
    expect(() => resolveAgeConstraint({ age: 14, ageGroup: 'adult' })).toThrow('age and ageGroup disagree')
  })

  it('uses a supplied asOf date or the current UTC date', () => {
    const now = new Date('2026-09-24T23:30:00-04:00')
    expect(resolveAsOf('2025-12-31', now)).toBe('2025-12-31')
    expect(resolveAsOf(undefined, now)).toBe('2026-09-25')
    expect(() => resolveAsOf('2025-02-29', now)).toThrow('Invalid asOf')
  })

  it('changes age on the calendar birthday at asOf', () => {
    expect(ageOn('2012-09-25', '2026-09-24')).toBe(13)
    expect(ageOn('2012-09-25', '2026-09-25')).toBe(14)
  })

  it('treats March 1 as the anniversary of a February 29 birth in non-leap years', () => {
    expect(ageOn('2024-02-29', '2025-02-28')).toBe(0)
    expect(ageOn('2024-02-29', '2025-03-01')).toBe(1)
  })

  it('rejects an impossible or future birth date', () => {
    expect(() => ageOn('2025-02-29', '2026-09-24')).toThrow('Invalid dateOfBirth')
    expect(() => ageOn('2027-01-01', '2026-09-24')).toThrow('dateOfBirth is after asOf')
  })

  it('checks the age, group, and birth date together at a fixed asOf', () => {
    const profile = { age: 27, ageGroup: 'adult' as const, dateOfBirth: '1999-04-05' }
    expect(isAgeProfileConsistent(profile, '2026-09-24')).toBe(true)
    expect(isAgeProfileConsistent({ ...profile, age: 28 }, '2026-09-24')).toBe(false)
    expect(isAgeProfileConsistent({ ...profile, ageGroup: 'teen' }, '2026-09-24')).toBe(false)
  })
})
