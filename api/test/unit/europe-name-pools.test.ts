import { describe, expect, it } from 'vitest'
import { europeReviewedNames } from '../../src/geography/europe-reviewed-names.js'
import { nameContextForCountry, selectName } from '../../src/geography/names.js'
import { getCountry } from '../../src/geography/countries.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'

const reviewedCodes = 'AD AL AT BA BE CH DE EE ES FI FR GB HR HU IE IT LI LU MC MD ME MT NL NO PT RO RS SE SI SM'.split(' ')
const key = '0123456789abcdef'.repeat(4)

describe('reviewed European name pools', () => {
  it('provides sourced, distinct, Latin-script components for the broad country batch', () => {
    expect(reviewedCodes).toHaveLength(30)
    for (const code of reviewedCodes) {
      const pool = europeReviewedNames[code]
      for (const field of ['female', 'male', 'family'] as const) {
        expect(pool[field].length).toBeGreaterThanOrEqual(field === 'family' ? 100 : 50)
        expect(new Set(pool[field]).size).toBe(pool[field].length)
        expect(pool[field].every((name) => !/[\u0370-\u052f\u0600-\u06ff]/u.test(name))).toBe(true)
      }
      expect(canGenerateProfile(getCountry(code)!)).toBe(true)
      expect(nameContextForCountry(code)).toMatchObject({ fallback: 'local', pools: [{ tier: 'local' }] })
      for (const gender of ['female', 'male'] as const) {
        const name = selectName(code, gender, key)
        expect(pool[gender]).toContain(name.firstName)
        expect(pool.family).toContain(name.lastName)
        expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
      }
    }
  })

  it('retains the documented Andorran civil-registry examples', () => {
    for (const name of ['Laia', 'Carlota', 'Emma', 'Martina', 'Aina', 'Laura']) {
      expect(europeReviewedNames.AD.female).toContain(name)
    }
    for (const name of ['Marc', 'Eric', 'Jan', 'Daniel', 'Jordi', 'Martí']) {
      expect(europeReviewedNames.AD.male).toContain(name)
    }
  })

  it('excludes a female given name misclassified as male in three candidate lists', () => {
    for (const code of ['LI', 'NL', 'SM'] as const) {
      expect(europeReviewedNames[code].male).not.toContain('Maria')
    }
  })
})
