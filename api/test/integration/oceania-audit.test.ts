import { describe, expect, it } from 'vitest'
import { auditGeographicData } from '../../src/geography/audit.js'
import { listCoverage } from '../../src/geography/coverage.js'

const codes = 'AS AU CK CX FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TL TO TV VU WF WS'.split(' ')
const pendingCodes = ['CX', 'KI', 'MH', 'MP', 'NF', 'NU', 'PN', 'TK', 'TO', 'TV', 'WF']

describe('Oceanian geographic review', () => {
  it('records all address reviews and keeps sparse name pools pending', () => {
    const rows = listCoverage().filter((row) => codes.includes(row.country))
    expect(rows).toHaveLength(27)
    expect(rows.every((row) => row.addresses.review === 'reviewed')).toBe(true)
    expect(rows.filter((row) => row.names.review === 'reviewed')).toHaveLength(16)
    const pending = rows.filter((row) => row.profileGeneration === 'pending-name-review')
    expect(pending.map((row) => row.country)).toEqual(pendingCodes)
    expect(pending.every((row) => Boolean(row.names.reviewNote))).toBe(true)
    expect(rows.filter((row) => row.addresses.status === 'partial').every((row) => Boolean(row.addresses.fallback))).toBe(true)
  })

  it('keeps the worldwide audit coherent', () => {
    expect(auditGeographicData()).toMatchObject({ profileEligibleCodes: 209,
      pendingNameReviewCodes: 33, sampledCodes: 242, errors: [] })
  })
})
