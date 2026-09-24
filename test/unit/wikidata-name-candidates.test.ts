import { describe, expect, it } from 'vitest'
import { collectCandidates, summarizeCandidates } from '../../scripts/collect-wikidata-name-candidates.mjs'

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

  it('saves each country, resumes completed work, and reports failures without discarding results', async () => {
    const calls: string[] = []
    const snapshots: Array<{ completed: string[]; failed: string[] }> = []
    const fetchRows = async (code: string, kind: string) => {
      calls.push(`${code}:${kind}`)
      if (code === 'CF') throw new Error('query timeout')
      return kind === 'given' ? [row(code, 'Amina', 2, 'female'), row(code, 'Amadou', 3, 'male')]
        : [row(code, 'Diallo', 4)]
    }
    const save = async (report: { countries: Record<string, unknown>; failures: Record<string, string> }) => {
      snapshots.push({ completed: Object.keys(report.countries), failed: Object.keys(report.failures) })
    }
    const first = await collectCandidates(['GH', 'CF', 'SN'], null, fetchRows, save)
    expect(first.countries.GH.counts).toEqual({ female: 1, male: 1, family: 1 })
    expect(first.countries.SN.counts).toEqual({ female: 1, male: 1, family: 1 })
    expect(first.failures.CF).toContain('timeout')
    expect(snapshots).toEqual([
      { completed: ['GH'], failed: [] },
      { completed: ['GH'], failed: ['CF'] },
      { completed: ['GH', 'SN'], failed: ['CF'] },
    ])
    calls.length = 0
    const second = await collectCandidates(['GH', 'CF', 'SN'], first, fetchRows, save)
    expect(calls).toEqual(['CF:given'])
    expect(second.failures.CF).toContain('timeout')
  })

  it('stops after repeated service failures and leaves untouched countries pending', async () => {
    const calls: string[] = []
    const report = await collectCandidates(['CF', 'CG', 'CI'], null, async (code: string) => {
      calls.push(code)
      throw new Error('query timeout')
    }, async () => {})
    expect(calls).toEqual(['CF', 'CG'])
    expect(Object.keys(report.failures)).toEqual(['CF', 'CG'])
    expect(report.countries.CI).toBeUndefined()
    expect(report.failures.CI).toBeUndefined()
  })
})
