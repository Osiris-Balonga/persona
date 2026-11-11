import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveNameProvider } from '../../src/geography/name-providers.js'
import { namePoolData } from '../../src/geography/name-pool-data.js'
import originals from '../fixtures/sparse-name-originals.json'

const report = JSON.parse(readFileSync(new URL('../../data/geography/africa-name-candidates-2026-09-24.json', import.meta.url), 'utf8'))
const normalize = (value: string) => value.normalize('NFC').trim().toLowerCase()
const genders = ['female', 'male'] as const

describe('sparse name source review', () => {
  it.each(['CG', 'BW', 'NA', 'SC', 'LS', 'ZA', 'ET', 'MW'] as const)(
    'traces every %s component to an approved original or licensed input field', country => {
      const provider = resolveNameProvider(country)!
      const components = Object.values(provider.pools)[0]
      const original = originals.countries[country] as Record<string, string[]>
      const candidates = report.countries[country]
      const facts = (field: string): string[] => candidates[field].map((entry: { name: string }) => entry.name)
      expect(components.strategy).not.toBe('full-name')
      if (components.strategy === 'full-name') return
      for (const gender of genders) {
        const originalGiven = original[gender] ?? original.given
        const givenSources = country === 'MW' ? ['Mavuto']
          : [...facts(gender), ...(country === 'ZA' ? namePoolData.zu_ZA[gender] : [])]
        const approvedGiven = new Set([...originalGiven, ...givenSources].map(normalize))
        for (const name of components.given[gender]) expect(approvedGiven.has(normalize(name)), `${country}/${gender}/${name}`).toBe(true)
        const secondSources = country === 'ET' ? [...original.male, ...facts('male')]
          : [...original.family, ...facts('family'), ...(country === 'ZA' ? namePoolData.zu_ZA.lastFemale : [])]
        const approvedSecond = new Set(secondSources.map(normalize))
        for (const name of components.second[gender]) expect(approvedSecond.has(normalize(name)), `${country}/second/${name}`).toBe(true)
        expect(components.given[gender]).toEqual(expect.arrayContaining(originalGiven))
        expect(components.second[gender]).toEqual(expect.arrayContaining(country === 'ET' ? original.male : original.family))
      }
      if (country === 'ET') {
        expect(components.second.female).toEqual(components.given.male)
        expect(components.second.male).toEqual(components.given.male)
      }
    },
  )
})
