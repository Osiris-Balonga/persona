import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'

describe('geographic catalog audit', () => {
  it('samples every resident-eligible ISO code and lists gaps without claiming manual review', () => {
    const report = auditGeographicData()
    expect(report).toMatchObject({ dataVersion: 'geo-2026-09-24.17', registryCodes: 249, eligibleCodes: 242,
      unavailableCodes: 7, profileEligibleCodes: 22, pendingNameReviewCodes: 220, sampledCodes: 242, errors: [] })
    expect(report.gaps.find((row) => row.country === 'CG')?.categories).toContain('addresses:partial')
    expect(report.gaps.find((row) => row.country === 'PN')?.categories).toContain('phone:pending')
    expect(report.gaps.some((row) => row.country === 'AQ')).toBe(false)
  })
})
