import { describe, expect, it } from 'vitest'
import { appearanceCategories } from '../../src/geography/appearance.js'
import { listCountries } from '../../src/geography/countries.js'
import { appearanceDistributionForCountry } from '../../src/geography/appearance-distribution.js'
import { chooseWeighted } from '../../src/geography/distribution.js'

describe('country-aware portrait appearance defaults', () => {
  it('covers every resident-eligible code with positive weights', () => {
    for (const country of listCountries().filter((entry) => entry.generation === 'eligible')) {
      const profile = appearanceDistributionForCountry(country.code)
      expect(profile.country).toBe(country.code)
      expect(profile.weights.length).toBeGreaterThan(0)
      expect(profile.weights.every(({ value, weight }) => appearanceCategories.includes(value) && Number.isSafeInteger(weight) && weight > 0)).toBe(true)
      expect(new Set(profile.weights.map(({ value }) => value)).size).toBe(profile.weights.length)
    }
  })

  it('prioritizes a regional default while retaining less common possibilities', () => {
    const france = appearanceDistributionForCountry('FR')
    const congo = appearanceDistributionForCountry('CG')
    const morocco = appearanceDistributionForCountry('MA')
    const weight = (country: typeof france, appearance: string) => country.weights.find(({ value }) => value === appearance)?.weight ?? 0
    expect(weight(france, 'european')).toBeGreaterThan(weight(france, 'black'))
    expect(weight(france, 'black')).toBeGreaterThan(0)
    expect(weight(congo, 'central-african')).toBeGreaterThan(weight(congo, 'european'))
    expect(weight(congo, 'european')).toBeGreaterThan(0)
    expect(weight(morocco, 'north-african')).toBeGreaterThan(weight(morocco, 'black'))
    expect(weight(morocco, 'black')).toBeGreaterThan(0)
  })

  it('records country evidence separately from editorial selection weights', () => {
    const us = appearanceDistributionForCountry('US')
    expect(us.basis).toBe('country-review')
    expect(us.references.some((source) => source.includes('census.gov'))).toBe(true)
    expect(us.weights.some(({ value }) => value === 'black')).toBe(true)
    expect(appearanceDistributionForCountry('CG').basis).toBe('regional-inference')
    const france = appearanceDistributionForCountry('FR')
    expect(france.basis).toBe('country-review')
    expect(france.references.some((source) => source.includes('insee.fr'))).toBe(true)
    expect(france.weights.some(({ value }) => value === 'west-african')).toBe(true)
  })

  it('reviews countries where a continental default would be misleading', () => {
    const top = (code: string) => appearanceDistributionForCountry(code).weights[0].value
    expect(top('SG')).toBe('east-asian')
    expect(top('MU')).toBe('south-asian')
    expect(top('GY')).toBe('south-asian')
    expect(top('QA')).toBe('south-asian')
    for (const code of ['CA', 'ZA', 'SG', 'MU', 'GY', 'QA']) {
      expect(appearanceDistributionForCountry(code).basis).toBe('country-review')
      expect(appearanceDistributionForCountry(code).references.length).toBeGreaterThan(0)
    }
  })

  it('keeps deterministic weighted selection', () => {
    const weights = appearanceDistributionForCountry('FR').weights
    expect(chooseWeighted(weights, 0)).toBe(weights[0].value)
    expect(chooseWeighted(weights, 0)).toBe(chooseWeighted(weights, weights.reduce((sum, item) => sum + item.weight, 0)))
  })
})
