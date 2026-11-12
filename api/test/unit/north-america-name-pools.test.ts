import { describe, expect, it } from 'vitest'
import { listCoverage } from '../../src/geography/coverage.js'
import { selectName } from '../../src/geography/names.js'

const citizenshipCodes = ['AG', 'BB', 'BM', 'BS', 'BZ', 'CA', 'CR', 'CU', 'DM', 'DO', 'GD',
  'GT', 'HN', 'HT', 'JM', 'KN', 'LC', 'MX', 'NI', 'PA', 'SV', 'TT', 'US', 'VC']
const birthplaceCodes = ['AW', 'CW', 'GL', 'GP', 'MQ', 'PR', 'VI']
const key = '1234567890abcdef'.repeat(4)

describe('reviewed North American and Caribbean name pools', () => {
  it.each([...citizenshipCodes, ...birthplaceCodes])('%s returns two locally reviewed display fields', (code) => {
    for (const gender of ['female', 'male'] as const) {
      const name = selectName(code, gender, key)
      expect(name.locale).toBe(`${code.toLowerCase()}_${code}`)
      expect(name.firstName.length).toBeGreaterThan(0)
      expect(name.lastName.length).toBeGreaterThan(0)
      expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`)
    }
    expect(listCoverage().find((row) => row.country === code)?.names.review).toBe('reviewed')
  })
})
