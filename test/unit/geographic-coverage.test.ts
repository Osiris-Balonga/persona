import { describe, expect, it } from 'vitest'
import { listCoverage, validateGeographicData } from '../../src/geography/coverage.js'

describe('geographic source coverage', () => {
  it('tracks each assigned code and makes incomplete product data explicit', () => {
    const rows = listCoverage()
    expect(rows).toHaveLength(249)
    expect(rows.find((row) => row.country === 'CG')).toMatchObject({
      registry: { status: 'ingested', source: 'iso-3166' },
      cities: { status: 'ingested', source: 'geonames' },
      names: { status: 'ingested', source: 'faker', fallback: 'language:fr' },
      addresses: { status: 'partial', source: 'libaddressinput-data', fallback: expect.stringContaining('global-format') },
      distributions: { status: 'partial', source: 'persona-policy', fallback: 'uniform-country,uniform-appearance' },
    })
    expect(rows.find((row) => row.country === 'AQ')).toMatchObject({
      cities: { status: 'not-applicable', source: null },
    })
    expect(rows.find((row) => row.country === 'PN')).toMatchObject({
      addresses: { supplementarySources: ['upu-pitcairn'] },
    })
    expect(validateGeographicData()).toEqual([])
  })
})
