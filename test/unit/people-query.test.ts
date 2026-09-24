import { describe, expect, it } from 'vitest'
import { parsePeopleQuery, PeopleQueryError } from '../../src/people-query.js'

const now = new Date('2026-09-24T23:30:00-04:00')
const parse = (query: string) => parsePeopleQuery(new URLSearchParams(query), now)

describe('GET /people query contract', () => {
  it('defaults to one person and the current UTC reference date', () => {
    expect(parse('')).toEqual({ count: 1, asOf: '2026-09-25' })
  })

  it('preserves explicit filters and derives the age group from numeric age', () => {
    expect(parse('count=20&gender=female&age=14&country=CG&city=Brazzaville&seed=school-demo&asOf=2026-09-24&fields=firstName,city,picture.url')).toEqual({
      count: 20,
      gender: 'female',
      age: 14,
      ageGroup: 'teen',
      country: 'CG',
      city: 'Brazzaville',
      seed: 'school-demo',
      asOf: '2026-09-24',
      fields: ['firstName', 'city', 'picture.url'],
    })
  })

  it('rejects nonnumeric and excessive ages or counts', () => {
    for (const query of ['age=teen', 'age=121', 'count=0', 'count=101']) {
      expect(() => parse(query)).toThrow(PeopleQueryError)
    }
    expect(() => parse('age=teen')).toThrow(expect.objectContaining({ code: 'INVALID_QUERY', parameter: 'age' }))
  })

  it('rejects incompatible explicit filters', () => {
    expect(() => parse('age=14&ageGroup=adult')).toThrow(expect.objectContaining({ code: 'CONFLICTING_FILTERS', parameter: 'ageGroup' }))
    expect(() => parse('city=Brazzaville')).toThrow(expect.objectContaining({ code: 'CONFLICTING_FILTERS', parameter: 'city' }))
  })

  it('rejects unknown or repeated parameters and bounded strings', () => {
    for (const query of ['limit=2', 'count=1&count=2', `seed=${'s'.repeat(129)}`]) {
      expect(() => parse(query)).toThrow(PeopleQueryError)
    }
  })
})
