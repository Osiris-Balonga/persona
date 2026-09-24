import { describe, expect, it } from 'vitest'
import { fictionalEmail, fictionalPhone } from '../../src/geography/fictional-contact.js'

const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('fictional contact values', () => {
  it('uses the reserved example domain and a stable disambiguator', () => {
    expect(fictionalEmail('Élodie', 'N’Diaye', key)).toBe('elodie.ndiaye.0123456789ab@example.test')
    expect(fictionalEmail('Élodie', 'N’Diaye', key)).toBe(fictionalEmail('Élodie', 'N’Diaye', key))
  })

  it('builds a stable address from the two displayed components of a Burmese name', () => {
    expect(fictionalEmail('Aye Aye', 'Myint', key)).toBe('ayeaye.myint.0123456789ab@example.test')
  })

  it('uses only vetted non-working number ranges and otherwise returns null', () => {
    expect(fictionalPhone('US', 'Washington', key)).toMatch(/^\+120255501\d{2}$/)
    expect(fictionalPhone('US', 'New York City', key)).toBeNull()
    expect(fictionalPhone('GB', 'London', key)).toMatch(/^\+447700900\d{3}$/)
    expect(fictionalPhone('CG', 'Brazzaville', key)).toBeNull()
    expect(fictionalPhone('PN', 'Adamstown', key)).toBeNull()
  })
})
