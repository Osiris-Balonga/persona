import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('bounded actionable public query errors', () => {
  it('explains how to correct field selections without reflecting arbitrary submitted values', async () => {
    const app = buildApp()
    try {
      const submitted = 'private-input-that-is-not-a-field'.repeat(8)
      const response = await app.inject(`/people?fields=${submitted}`)
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ error: {
        code: 'INVALID_QUERY', parameter: 'fields',
        message: 'fields must contain distinct public paths without parent/child overlaps; see the API field list',
      } })
      expect(response.body).not.toContain(submitted)
      expect(response.headers['cache-control']).toBe('no-store')
    } finally { await app.close() }
  })

  it('bounds unknown parameter reporting and gives corrective guidance for incompatible ages', async () => {
    const app = buildApp()
    try {
      const response = await app.inject(`/people?${'unexpected'.repeat(30)}=1`)
      expect(response.json()).toEqual({ error: {
        code: 'INVALID_QUERY', parameter: 'query', message: 'Use only documented query parameters, each at most once',
      } })
      const incompatible = await app.inject('/people?portraitContexts=school-pupil&ageGroup=adult')
      expect(incompatible.json()).toEqual({ error: {
        code: 'CONFLICTING_FILTERS', parameter: 'ageGroup',
        message: 'ageGroup has no eligible ages for the selected portrait types; change ageGroup or add a compatible portrait type',
      } })
    } finally { await app.close() }
  })
})
