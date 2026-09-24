import { describe, expect, it } from 'vitest'
import { listCoverage } from '../../src/geography/coverage.js'
import { selectName } from '../../src/geography/names.js'

const codes = ['AE', 'AF', 'AM', 'BD', 'BH', 'GE', 'IL', 'IN', 'IQ', 'IR', 'JO', 'KW', 'LB',
  'LK', 'NP', 'PH', 'PK', 'PS', 'SA', 'SY', 'TR', 'YE']
const key = '1234567890abcdef'.repeat(4)

describe('reviewed Asian name pools', () => {
  it.each(codes)('%s uses a locally reviewed pool with two display fields', (code) => {
    const female = selectName(code, 'female', key)
    const male = selectName(code, 'male', key)
    expect(female.locale).toBe(`${code.toLowerCase()}_${code}`)
    expect(male.locale).toBe(female.locale)
    expect(female.fullName).toBe(`${female.firstName} ${female.lastName}`)
    expect(male.fullName).toBe(`${male.firstName} ${male.lastName}`)
    expect(listCoverage().find((row) => row.country === code)?.names.review).toBe('reviewed')
  })
})
