import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'
import { listCoverage } from '../../src/geography/coverage.js'

const codes = 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE'.split(' ')

describe('South American geographic review', () => {
  it('records all name and address reviews with visible format fallbacks', () => {
    const rows = listCoverage().filter((row) => codes.includes(row.country))
    expect(rows).toHaveLength(14)
    expect(rows.every((row) => row.names.review === 'reviewed' && row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.every((row) => row.profileGeneration === 'available')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial').every((row) => Boolean(row.addresses.fallback))).toBe(true)
  })

  it('keeps the worldwide audit coherent', () => {
    expect(auditGeographicData()).toMatchObject({ profileEligibleCodes: 209,
      pendingNameReviewCodes: 33, sampledCodes: 242, errors: [] })
  })
})
