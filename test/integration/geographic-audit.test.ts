import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'
import { listCoverage } from '../../src/geography/coverage.js'

describe('geographic catalog audit', () => {
  it('records the reviewed Africa address examples and retains explicit partial fallbacks', () => {
    const rows = listCoverage().filter((row) => row.profileGeneration === 'available'
      && !['BT', 'MM'].includes(row.country))
    expect(rows).toHaveLength(58)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial')).toHaveLength(36)
    expect(rows.filter((row) => row.addresses.status === 'partial'
      && !row.addresses.fallback)).toEqual([])
  })
  it('samples every resident-eligible ISO code and lists gaps without claiming manual review', () => {
    const report = auditGeographicData()
    expect(report).toMatchObject({ dataVersion: 'geo-2026-09-24.28', registryCodes: 249, eligibleCodes: 242,
      unavailableCodes: 7, profileEligibleCodes: 60, pendingNameReviewCodes: 182, sampledCodes: 242, errors: [] })
    expect(report.gaps.find((row) => row.country === 'CG')?.categories).toContain('addresses:partial')
    expect(report.gaps.find((row) => row.country === 'PN')?.categories).toContain('phone:pending')
    expect(report.gaps.some((row) => row.country === 'AQ')).toBe(false)
  })
})
