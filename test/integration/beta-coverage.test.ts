import { describe, expect, it } from 'vitest'
import { auditBetaHttp } from '../../src/beta-audit.js'

describe('public beta HTTP coverage', () => {
  it('audits every assigned code and records explicit availability and portrait gaps', async () => {
    const report = await auditBetaHttp()
    expect(report.errors).toEqual([])
    expect(report.available).toHaveLength(209)
    expect(report.pendingNameReview).toHaveLength(33)
    expect(report.unavailable).toEqual(['AQ', 'BV', 'GS', 'HM', 'IO', 'TF', 'UM'])
    expect(report.available).toContain('MW')
    expect(report.pendingNameReview).toContain('PN')
    expect(report.portrait.approvedAssets).toBe(1086)
    expect(report.portrait.coveredAgeBands).toBe(835)
    expect(report.portrait.totalAgeBands).toBe(836)
    expect(report.portrait.missingAgeBands).toEqual([
      { collection: 'asia-central', gender: 'female', ageRange: [13, 15] },
    ])
    expect([...report.available, ...report.pendingNameReview, ...report.unavailable].sort())
      .toHaveLength(249)
  }, 15_000)
})
