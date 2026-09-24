import { describe, expect, it } from 'vitest'
import { listCoverage } from '../../src/geography/coverage.js'
import { selectName } from '../../src/geography/names.js'
import { asiaEastNames } from '../../src/geography/asia-east-names.js'
import { asiaCentralNames } from '../../src/geography/asia-central-names.js'

const codes = ['AE', 'AF', 'AM', 'AZ', 'BD', 'BH', 'CN', 'GE', 'HK', 'IL', 'IN', 'IQ', 'IR', 'JO', 'JP',
  'KG', 'KP', 'KR', 'KW', 'KZ', 'LB', 'LK', 'NP', 'PH', 'PK', 'PS', 'SA', 'SY', 'TR', 'TW', 'UZ', 'VN', 'YE']
const key = '1234567890abcdef'.repeat(4)

describe('reviewed Asian name pools', () => {
  it('excludes middle-name markers and out-of-context labels from eastern pools', () => {
    expect(asiaEastNames.VN.female).not.toContain('Thị')
    expect(asiaEastNames.KP.female).not.toContain('Jon')
    expect(asiaEastNames.KP.family).not.toContain('Terakoshi')
    expect(asiaEastNames.CN.male).not.toContain('Joseph')
  })
  it.each(['AZ', 'KG', 'KZ', 'UZ'] as const)('%s keeps gendered family forms separate', (code) => {
    const names = asiaCentralNames[code]
    expect(names.familyFemale.every((name) => /(ova|eva|yeva|yewa|yowa|qyzy|kyzy)$/i.test(name))).toBe(true)
    expect(names.familyMale.every((name) => /(ov|ev|yev|ýew|uly)$/i.test(name))).toBe(true)
  })
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
