import { describe, expect, it } from 'vitest'
import { selectName } from '../../src/geography/names.js'
import { hasReviewedNamePool } from '../../src/geography/profile-availability.js'

const codes = 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE'.split(' ')
const key = '0123456789abcdef'.repeat(4)

describe('reviewed South American name pools', () => {
  it.each(codes)('generates two nonempty local name fields for %s', (country) => {
    expect(hasReviewedNamePool(country)).toBe(true)
    for (const gender of ['female', 'male'] as const) {
      const name = selectName(country, gender, key)
      expect(name.firstName).toBeTruthy()
      expect(name.lastName).toBeTruthy()
      expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      expect(name.fallback).toBe('local')
    }
  })
})
