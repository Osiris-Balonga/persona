import { describe, expect, it } from 'vitest'
import { listCoverage } from '../../src/geography/coverage.js'
import { selectName } from '../../src/geography/names.js'

const codes = ['BG', 'BY', 'CY', 'CZ', 'GR', 'IS', 'LT', 'LV', 'MK', 'PL', 'RU', 'SK', 'UA']
const key = '1234567890abcdef'.repeat(4)

describe('European gendered family-name pools', () => {
  it.each(codes)('%s has locally reviewed male and female names', (code) => {
    const female = selectName(code, 'female', key)
    const male = selectName(code, 'male', key)
    expect(female.firstName).toBeTruthy()
    expect(female.lastName).toBeTruthy()
    expect(male.firstName).toBeTruthy()
    expect(male.lastName).toBeTruthy()
    expect(female.locale).toBe(`${code.toLowerCase()}_${code}`)
    expect(listCoverage().find((row) => row.country === code)?.names.review).toBe('reviewed')
  })

  it('keeps characteristic Icelandic and Czech family forms aligned with gender', () => {
    for (let n = 0; n < 32; n++) {
      const sampleKey = '0'.repeat(24) + n.toString(16).padStart(12, '0') + '0'.repeat(28)
      expect(selectName('IS', 'female', sampleKey).lastName).toMatch(/dóttir$/u)
      expect(selectName('IS', 'male', sampleKey).lastName).toMatch(/sson$/u)
      expect(selectName('CZ', 'female', sampleKey).lastName).not.toMatch(/Novák$|Svoboda$/u)
      expect(selectName('CZ', 'male', sampleKey).lastName).not.toMatch(/ová$/u)
    }
  })
})
