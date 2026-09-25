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
    expect(report.portrait.readyCombinations).toBe(0)
    expect(report.portrait.approvedAssets).toBe(0)
    expect([...report.available, ...report.pendingNameReview, ...report.unavailable].sort())
      .toHaveLength(249)
  })
})
