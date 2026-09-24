import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Value from 'typebox/value'
import { PersonSchema } from '../../src/contracts/person.js'

const example = JSON.parse(
  readFileSync(new URL('../../examples/person-v1.json', import.meta.url), 'utf8'),
) as Record<string, unknown>

describe('public Person v1 schema', () => {
  it('accepts the published example with structured address and optional contact data', () => {
    expect(PersonSchema.$id).toBe('urn:persona:schema:person:v1')
    expect(Value.Check(PersonSchema, example)).toBe(true)
    expect(Value.Check(PersonSchema, { ...example, picture: null })).toBe(true)
    expect(Value.Check(PersonSchema, { ...example, address: { ...(example.address as object), region: null, formatted: '18 rue des Manguiers\nBrazzaville' } })).toBe(true)
    expect(Value.Check(PersonSchema, { ...example, address: { ...(example.address as object), region: undefined } })).toBe(false)
  })

  it('accepts a complete given name without a family surname', () => {
    const person = { ...example, firstName: 'Aye Aye Myint', lastName: null, fullName: 'Aye Aye Myint',
      country: 'MM', city: 'Yangon', appearance: 'southeast-asian',
      address: { line1: '18 Example Road', city: 'Yangon', region: 'Yangon Region', postalCode: null,
        country: 'MM', formatted: '18 Example Road\nYangon\nMyanmar' },
      email: 'ayeayemyint.0123456789ab@example.test', phone: null, picture: null }
    expect(Value.Check(PersonSchema, person)).toBe(true)
    expect(Value.Check(PersonSchema, { ...person, lastName: undefined })).toBe(false)
    expect(Value.Check(PersonSchema, { ...person, lastName: '' })).toBe(false)
  })

  it('rejects a non-numeric age and an impossible birth date', () => {
    expect(Value.Check(PersonSchema, { ...example, age: '27' })).toBe(false)
    expect(Value.Check(PersonSchema, { ...example, dateOfBirth: '1999-02-30' })).toBe(false)
  })

  it('does not accept a real email domain as fictional contact data', () => {
    expect(Value.Check(PersonSchema, {
      ...example,
      email: 'grace.mbemba@gmail.com',
    })).toBe(false)
  })

  it('rejects internal fields at any level of the public object', () => {
    expect(Value.Check(PersonSchema, { ...example, culturalRegion: 'Central Africa' })).toBe(false)
    expect(Value.Check(PersonSchema, {
      ...example,
      address: { ...(example.address as object), sourceId: 'cg-street-rules-2026' },
    })).toBe(false)
  })
})
