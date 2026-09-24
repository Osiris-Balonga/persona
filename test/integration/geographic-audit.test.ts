import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'
import { listCoverage } from '../../src/geography/coverage.js'
import { europeReviewedNames } from '../../src/geography/europe-reviewed-names.js'
import { europeGenderedNames } from '../../src/geography/europe-gendered-names.js'
import { europeIslandNames } from '../../src/geography/europe-island-names.js'
import { africaReviewedNames } from '../../src/geography/africa-reviewed-names.js'

describe('geographic catalog audit', () => {
  it('labels reviewed Europe address examples while retaining unresolved format gaps', () => {
    const rows = listCoverage().filter((row) => Object.hasOwn(europeReviewedNames, row.country)
      || Object.hasOwn(europeGenderedNames, row.country) || Object.hasOwn(europeIslandNames, row.country))
    expect(rows).toHaveLength(50)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial')).toHaveLength(44)
    const pendingNameRows = listCoverage().filter((row) => ['SJ', 'VA'].includes(row.country))
    expect(pendingNameRows.map((row) => row.addresses.review)).toEqual(['reviewed', 'reviewed'])
    expect(pendingNameRows.map((row) => row.names.review)).toEqual(['automated', 'automated'])
  })
  it('records the reviewed Africa address examples and retains explicit partial fallbacks', () => {
    const rows = listCoverage().filter((row) => Object.hasOwn(africaReviewedNames, row.country)
      || ['ET', 'MW'].includes(row.country))
    expect(rows).toHaveLength(58)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial')).toHaveLength(36)
    expect(rows.filter((row) => row.addresses.status === 'partial'
      && !row.addresses.fallback)).toEqual([])
  })
  it('samples every resident-eligible ISO code and lists gaps without claiming manual review', () => {
    const report = auditGeographicData()
    expect(report).toMatchObject({ dataVersion: 'geo-2026-09-25.2', registryCodes: 249, eligibleCodes: 242,
      unavailableCodes: 7, profileEligibleCodes: 110, pendingNameReviewCodes: 132, sampledCodes: 242, errors: [] })
    expect(report.gaps.find((row) => row.country === 'CG')?.categories).toContain('addresses:partial')
    expect(report.gaps.find((row) => row.country === 'PN')?.categories).toContain('phone:pending')
    expect(report.gaps.some((row) => row.country === 'AQ')).toBe(false)
  })
})
