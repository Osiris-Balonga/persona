import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { auditCandidateReport } from '../../scripts/audit-name-candidates.mjs'

describe('Africa name candidate snapshot', () => {
  it('keeps all 58 codes and source-backed counts visible without publishing candidates', () => {
    const report = JSON.parse(readFileSync('data/geography/africa-name-candidates-2026-09-24.json', 'utf8'))
    const audit = auditCandidateReport(report)
    expect(audit.requestedCodes).toBe(58)
    expect(audit.completedCodes).toBe(58)
    expect(audit.failedCodes).toBe(0)
    expect(audit.rows.find((row: { code: string }) => row.code === 'CF')).toMatchObject({
      status: 'complete', counts: { female: 65, male: 231, family: 90 },
      source: 'https://qlever.dev/api/wikidata',
    })
    expect(audit.rows.find((row: { code: string }) => row.code === 'YT')).toMatchObject({
      status: 'complete', counts: { female: 0, male: 0, family: 0 },
    })
    expect(report.countries.CF.female[0]).toEqual({ name: expect.any(String), count: expect.any(Number) })
  })

  it('flags low coverage, ambiguous fields, and missing countries for review', () => {
    const report = { requestedCodes: ['AA', 'BB', 'CC'], countries: {
      AA: { source: 'example', counts: { female: 1, male: 1, family: 1 },
        rejectedLabels: { female: 0, male: 0, family: 1 },
        ambiguousGivenNames: ['Alex'],
        female: [{ name: 'Alex', count: 1 }], male: [{ name: 'Alex', count: 1 }],
        family: [{ name: 'Alex', count: 1 }], sourceRowsSha256: 'a'.repeat(64) },
    }, failures: { BB: 'timeout' } }
    const audit = auditCandidateReport(report)
    expect(audit).toMatchObject({ requestedCodes: 3, completedCodes: 1, failedCodes: 1,
      pendingCodes: 1, broadCandidateCodes: 0 })
    expect(audit.rows[0]).toMatchObject({ status: 'complete', ambiguousGivenNames: 1,
      givenFamilyOverlap: 1, rejectedLabels: { family: 1 } })
    expect(audit.rows[1]).toMatchObject({ code: 'BB', status: 'failed' })
    expect(audit.rows[2]).toMatchObject({ code: 'CC', status: 'pending' })
  })
})
