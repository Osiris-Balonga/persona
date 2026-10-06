import { describe, expect, it, vi } from 'vitest'
import { generatePeopleResponse } from '../../src/generate-people.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import * as geography from '../../src/geography/distribution.js'
import * as names from '../../src/geography/names.js'

describe('name collision retries', () => {
  it('does not resolve geography again when retrying names in a sparse pool', () => {
    const location = vi.spyOn(geography, 'resolveGeographicContext')
    const selection = vi.spyOn(names, 'selectName')
    try {
      const query = parsePeopleQuery(new URLSearchParams('nationality=MW&ageGroup=adult&seed=benchmark&asOf=2026-01-01&count=100'))
      const result = generatePeopleResponse(query, { version: 'empty-v1', publicBaseUrl: null, assets: [] })
      expect(result.results).toHaveLength(100)
      expect(selection.mock.calls.length).toBeGreaterThan(100)
      expect(location).toHaveBeenCalledTimes(100)
      for (const person of result.results) {
        expect(person.fullName).toBe(`${person.firstName} ${person.lastName}`)
        expect(person.email).toMatch(/@example\.test$/)
        expect(person.country).toBe('MW')
      }
    } finally { location.mockRestore(); selection.mockRestore() }
  })
})
