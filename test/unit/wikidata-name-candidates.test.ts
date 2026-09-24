import { describe, expect, it } from 'vitest'
import { summarizeCandidates } from '../../scripts/collect-wikidata-name-candidates.mjs'

const row = (code: string, name: string, count: number, sex?: 'male' | 'female') => ({ code, name, count, sex })

describe('Wikidata name candidate review', () => {
  it('keeps countries and genders separate while flagging ambiguous names', () => {
    const report = summarizeCandidates(
      [row('GH', 'Ama', 8, 'female'), row('GH', 'Kojo', 7, 'male'), row('GH', 'Nana', 4, 'female'),
        row('GH', 'Nana', 3, 'male'), row('SN', 'Awa', 5, 'female')],
      [row('GH', 'Mensah', 12), row('SN', 'Diouf', 9)], ['GH', 'SN'], 100,
    )
    expect(report.GH).toMatchObject({
      female: [{ name: 'Ama', count: 8 }, { name: 'Nana', count: 4 }],
      male: [{ name: 'Kojo', count: 7 }, { name: 'Nana', count: 3 }],
      family: [{ name: 'Mensah', count: 12 }], ambiguousGivenNames: ['Nana'],
      counts: { female: 2, male: 2, family: 1 },
    })
    expect(report.SN).toMatchObject({ female: [{ name: 'Awa', count: 5 }], male: [],
      family: [{ name: 'Diouf', count: 9 }] })
  })

  it('rejects entity IDs, malformed labels, and invalid counts without padding a sparse country', () => {
    const report = summarizeCandidates(
      [row('LS', 'Mamoipone', 2, 'female'), row('LS', 'Q123456', 8, 'male'),
        row('LS', 'https://example.test/name', 5, 'male'), row('LS', 'Test123', 3, 'male'),
        row('LS', 'Thabo', -1, 'male')],
      [row('LS', 'Senauoane', 1), row('LS', 'Q98765', 5)], ['LS'], 100,
    )
    expect(report.LS).toMatchObject({ counts: { female: 1, male: 0, family: 1 },
      female: [{ name: 'Mamoipone', count: 2 }], male: [], family: [{ name: 'Senauoane', count: 1 }] })
  })
})
