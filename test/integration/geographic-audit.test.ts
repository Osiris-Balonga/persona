import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'
import { listCoverage } from '../../src/geography/coverage.js'
import { europeReviewedNames } from '../../src/geography/europe-reviewed-names.js'
import { europeGenderedNames } from '../../src/geography/europe-gendered-names.js'
import { europeIslandNames } from '../../src/geography/europe-island-names.js'
import { asiaReviewedNames } from '../../src/geography/asia-reviewed-names.js'
import { asiaWestNames } from '../../src/geography/asia-west-names.js'
import { asiaEastNames } from '../../src/geography/asia-east-names.js'
import { asiaCentralNames } from '../../src/geography/asia-central-names.js'
import { asiaAdditionalNames } from '../../src/geography/asia-additional-names.js'
import { africaReviewedNames } from '../../src/geography/africa-reviewed-names.js'

describe('geographic catalog audit', () => {
  it('records reviewed Asian name and address samples without hiding partial formats', () => {
    const rows = listCoverage().filter((row) => Object.hasOwn(asiaReviewedNames, row.country)
      || Object.hasOwn(asiaWestNames, row.country) || Object.hasOwn(asiaEastNames, row.country)
      || Object.hasOwn(asiaCentralNames, row.country) || Object.hasOwn(asiaAdditionalNames, row.country))
    expect(rows).toHaveLength(38)
    expect(rows.every((row) => row.names.review === 'reviewed' && row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial')).toHaveLength(38)
    const asiaCodes = ['AE','AF','AM','AZ','BD','BH','BN','BT','CC','CN','GE','HK','ID','IL','IN','IQ','IR','JO','JP','KG','KH','KP','KR','KW','KZ','LA','LB','LK','MM','MN','MO','MV','MY','NP','OM','PH','PK','PS','QA','SA','SG','SY','TH','TJ','TM','TR','TW','UZ','VN','YE']
    expect(listCoverage().filter((row) => asiaCodes.includes(row.country) && row.addresses.review === 'reviewed')).toHaveLength(50)
    const pending = listCoverage().filter((row) => asiaCodes.includes(row.country)
      && row.profileGeneration === 'pending-name-review')
    expect(pending.map((row) => row.country)).toEqual(['BN', 'CC', 'KH', 'LA', 'MN', 'MO', 'MY', 'OM', 'TJ', 'TM'])
    expect(pending.every((row) => typeof row.names.reviewNote === 'string' && row.names.reviewNote.length > 0)).toBe(true)
  })
  it('labels reviewed Europe address examples while retaining unresolved format gaps', () => {
    const rows = listCoverage().filter((row) => Object.hasOwn(europeReviewedNames, row.country)
      || Object.hasOwn(europeGenderedNames, row.country) || Object.hasOwn(europeIslandNames, row.country))
    expect(rows).toHaveLength(50)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial')).toHaveLength(50)
    const pendingNameRows = listCoverage().filter((row) => ['SJ', 'VA'].includes(row.country))
    expect(pendingNameRows.map((row) => row.addresses.review)).toEqual(['reviewed', 'reviewed'])
    expect(pendingNameRows.map((row) => row.names.review)).toEqual(['automated', 'automated'])
  })
  it('records the reviewed Africa address examples and retains explicit partial fallbacks', () => {
    const rows = listCoverage().filter((row) => Object.hasOwn(africaReviewedNames, row.country)
      || ['ET', 'MW'].includes(row.country))
    expect(rows).toHaveLength(58)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial')).toHaveLength(58)
    expect(rows.filter((row) => row.addresses.status === 'partial'
      && !row.addresses.fallback)).toEqual([])
  })
  it('samples every resident-eligible ISO code and lists gaps without claiming manual review', () => {
    const report = auditGeographicData()
    expect(report).toMatchObject({ dataVersion: 'geo-2026-09-25.13', registryCodes: 249, eligibleCodes: 242,
      unavailableCodes: 7, profileEligibleCodes: 209, pendingNameReviewCodes: 33, sampledCodes: 242, errors: [] })
    expect(report.gaps.find((row) => row.country === 'CG')?.categories).toContain('addresses:partial')
    expect(report.gaps.find((row) => row.country === 'PN')?.categories).toContain('phone:pending')
    expect(report.gaps.some((row) => row.country === 'AQ')).toBe(false)
  })
})
