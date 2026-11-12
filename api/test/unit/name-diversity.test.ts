import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { listCountryNameDiversity, summarizeNameDiversity } from '../../src/geography/name-diversity.js'
import type { NameComponents, NameProvider } from '../../src/geography/name-providers.js'

function provider(components: NameComponents): NameProvider {
  return { context: { pools: [{ locale: 'local', tier: 'local', weight: 1 }], fallback: 'local' },
    reviewed: true, source: 'persona-policy', supplementarySources: [], pools: { local: components } }
}

describe('name combination capacity', () => {
  it('reports the source license, edition and independently checked snapshot digest', () => {
    const candidateBytes = readFileSync(new URL('../../data/geography/africa-name-candidates-2026-09-24.json', import.meta.url))
    const snapshotHash = createHash('sha256').update(candidateBytes.toString('utf8').replaceAll('\r\n', '\n')).digest('hex')
    const burundi = listCountryNameDiversity().find(row => row.country === 'BI')!
    expect(burundi.sources).toContainEqual(expect.objectContaining({
      id: 'wikidata-africa-qlever-candidates', license: 'CC0-1.0', edition: '2026-09-24', sha256: snapshotHash,
    }))
  })

  it('counts whole names without inventing surname combinations', () => {
    const result = summarizeNameDiversity(provider({ strategy: 'full-name',
      given: { female: ['Aye Aye', 'Aye Aye Myint'], male: ['Tin Win'] } }))
    expect(result.female).toEqual({ given: 2, second: 0, combinations: 2 })
    expect(result.male.combinations).toBe(1)
    expect(result.minimumCombinations).toBe(1)
  })

  it('counts only distinct patronymics rather than multiplying array lengths', () => {
    const result = summarizeNameDiversity(provider({ strategy: 'patronymic',
      given: { female: ['Abeba'], male: ['Abebe', 'Dawit'] },
      second: { female: ['Abebe', 'Dawit'], male: ['Abebe', 'Dawit'] } }))
    expect(result.female.combinations).toBe(2)
    expect(result.male.combinations).toBe(2)
    expect(result.issues).toEqual([])
  })

  it('deduplicates spelling-equivalent labels, ambiguous splits and overlapping weighted pools', () => {
    const input = provider({ strategy: 'paired',
      given: { female: ['Ana', ' ANa ', 'Aná', 'Ana\u0301', 'Mary Jane', 'Mary'], male: ['John'] },
      second: { female: ['Smith', 'Jane Smith'], male: ['Smith'] } })
    input.context = { pools: [...input.context.pools, { locale: 'other', tier: 'local', weight: 2 }], fallback: 'local' }
    input.pools = { ...input.pools, other: input.pools.local }
    const result = summarizeNameDiversity(input)
    expect(result.female).toEqual({ given: 4, second: 2, combinations: 7 })
    expect(result.male.combinations).toBe(1)
    expect(result.issues).toContain('local/female/given: duplicate labels')
  })

  it('ignores unreachable pools and exposes missing components', () => {
    const input = provider({ strategy: 'full-name', given: { female: ['Aye Aye'], male: ['Tin Win'] } })
    input.context = { pools: [
      ...input.context.pools, { locale: 'disabled', tier: 'global', weight: 0 },
      { locale: 'missing', tier: 'local', weight: 1 },
    ], fallback: 'local' }
    const result = summarizeNameDiversity(input)
    expect(result.female.combinations).toBe(1)
    expect(result.issues).toEqual(['missing: missing pool'])
  })

  it('does not count names that cannot fill both public display fields', () => {
    const result = summarizeNameDiversity(provider({ strategy: 'full-name',
      given: { female: ['Kyi', 'Aye Aye'], male: [] } }))
    expect(result.female.combinations).toBe(1)
    expect(result.male.combinations).toBe(0)
    expect(result.issues).toContain('local/female: full name needs two display components')
    expect(result.issues).toContain('local/male/given: empty pool')
  })
})
