import { describe, expect, it } from 'vitest'
import { listCoverage } from '../../src/geography/coverage.js'
import { selectName } from '../../src/geography/names.js'

const reviewedCodes = ['AX', 'DK', 'FO', 'GG', 'GI', 'IM', 'JE']
const key = '1234567890abcdef'.repeat(4)

describe('European island and microterritory pools', () => {
  it.each(reviewedCodes)('%s has a reviewed local pool', (code) => {
    const female = selectName(code, 'female', key)
    const male = selectName(code, 'male', key)
    expect(female.locale).toBe(`${code.toLowerCase()}_${code}`)
    expect(male.locale).toBe(female.locale)
    expect(female.firstName).toBeTruthy()
    expect(female.lastName).toBeTruthy()
    expect(male.firstName).toBeTruthy()
    expect(male.lastName).toBeTruthy()
    expect(listCoverage().find((row) => row.country === code)?.names.review).toBe('reviewed')
  })

  it('keeps Svalbard and Vatican City pending without claiming a borrowed local pool', () => {
    for (const code of ['SJ', 'VA']) {
      const row = listCoverage().find((item) => item.country === code)
      expect(row?.profileGeneration).toBe('pending-name-review')
      expect(row?.names.review).toBe('automated')
    }
  })
})
