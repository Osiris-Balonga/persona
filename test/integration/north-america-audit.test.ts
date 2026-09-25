import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'
import { listCoverage } from '../../src/geography/coverage.js'

const codes = 'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI'.split(' ')
const pendingCodes = ['AI', 'BL', 'BQ', 'KY', 'MF', 'MS', 'PM', 'SX', 'TC', 'VG']

describe('North American and Caribbean geographic review', () => {
  it('records all address reviews and leaves sparse name pools visibly pending', () => {
    const rows = listCoverage().filter((row) => codes.includes(row.country))
    expect(rows).toHaveLength(41)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.names.review === 'reviewed')).toHaveLength(31)
    const pending = rows.filter((row) => row.profileGeneration === 'pending-name-review')
    expect(pending.map((row) => row.country)).toEqual(pendingCodes)
    expect(pending.every((row) => typeof row.names.reviewNote === 'string' && row.names.reviewNote.length > 0)).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial').every((row) => Boolean(row.addresses.fallback))).toBe(true)
  })

  it('keeps the worldwide geographic audit coherent', () => {
    expect(auditGeographicData()).toMatchObject({ profileEligibleCodes: 179,
      pendingNameReviewCodes: 63, sampledCodes: 242, errors: [] })
  })
})
