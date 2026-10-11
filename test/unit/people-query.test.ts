import { describe, expect, it } from 'vitest'
import { parsePeopleQuery, PeopleQueryError } from '../../src/people-query.js'

const now = new Date('2026-09-24T23:30:00-04:00')
const parse = (query: string) => parsePeopleQuery(new URLSearchParams(query), now)

describe('GET /people query contract', () => {
  it('defaults to one person and the current UTC reference date', () => {
    expect(parse('')).toEqual({ count: 1, asOf: '2026-09-25', emailDomain: 'example.test' })
  })

  it('rejects unsupported phone modes', () => {
    expect(() => parse('phoneMode=zero')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'phoneMode' }))
  })

  it('preserves explicit filters and copies nationality to residence', () => {
    expect(parse('count=20&gender=female&ageGroup=teen&nationality=MW&city=Lilongwe&seed=school-demo&asOf=2026-09-24&fields=name.first,location.city,picture.large')).toEqual({
      count: 20,
      gender: 'female',
      ageGroup: ['teen'],
      nationality: 'MW',
      residenceCountry: 'MW',
      city: 'Lilongwe',
      seed: 'school-demo',
      asOf: '2026-09-24',
      emailDomain: 'example.test',
      fields: ['name.first', 'location.city', 'picture.large'],
    })
  })

  it('rejects exact ages, unknown age groups, and excessive counts', () => {
    for (const query of ['age=14', 'ageGroup=unknown', 'count=0', 'count=101']) {
      expect(() => parse(query)).toThrow(PeopleQueryError)
    }
    expect(() => parse('age=14')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'age' }))
    expect(() => parse('ageGroup=unknown')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'ageGroup' }))
  })

  it('rejects incompatible explicit filters', () => {
    expect(() => parse('continent=africa&nationality=FR')).toThrow(expect.objectContaining({ code: 'CONFLICTING_FILTERS', parameter: 'continent' }))
    expect(() => parse('city=Brazzaville')).toThrow(expect.objectContaining({ code: 'CONFLICTING_FILTERS', parameter: 'city' }))
    expect(() => parse('residenceCountry=MW&city=Paris')).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_VALUE', parameter: 'city' }))
  })

  it('rejects unknown or repeated parameters and bounded strings', () => {
    for (const query of ['limit=2', 'count=1&count=2', `seed=${'s'.repeat(129)}`]) {
      expect(() => parse(query)).toThrow(PeopleQueryError)
    }
    expect(() => parse('appearance=martian')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'appearance' }))
    expect(() => parse('ageGroup=adult,adult')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'ageGroup' }))
    expect(parse('ageGroup=senior,adult').ageGroup).toEqual(['adult', 'senior'])
  })
})
