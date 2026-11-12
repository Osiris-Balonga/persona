import { describe, expect, it, vi } from 'vitest'
import * as core from '../../src/generation-core.js'
import { generatePeopleResponse } from '../../src/generate-people.js'

describe('bounded pagination generation', () => {
  it('uses absolute indices near the end without generating all preceding people', () => {
    const draw = vi.spyOn(core, 'generatePersonWithoutPortrait')
    try {
      const response = generatePeopleResponse({ count: 10, asOf: '2026-11-12', seed: 'late-page',
        pagination: { total: 10000, limit: 100, offset: 9990 } },
      { version: 'empty-test', publicBaseUrl: null, assets: [] })
      expect(response.results).toHaveLength(10)
      const indices = draw.mock.calls.map(call => call[2])
      expect(indices).toContain(9999)
      expect(indices).not.toContain(0)
      expect(draw.mock.calls.length).toBeLessThanOrEqual(200)
      expect(new Set(response.results.map(person => person.id)).size).toBe(10)
    } finally { draw.mockRestore() }
  })
})
