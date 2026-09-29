import { describe, expect, it } from 'vitest'
import { isPortraitCompliant, matchesPortraitFilters } from '../../review/gallery-filters.js'

const portrait = {
  status: 'ready-for-review',
  metadata: { ageGroup: 'adult', apparentAgeMin: 28, apparentAgeMax: 32, gender: 'female', appearance: 'west-african' },
  technical: { format: 'webp', width: 512, height: 512, pages: 1, bytes: 42_000 },
}

describe('portrait gallery filters', () => {
  it('matches the selected age category, exact five-year interval, gender and appearance', () => {
    expect(matchesPortraitFilters(portrait, {
      status: 'ready-for-review', appearance: 'west-african', ageGroup: 'adult', ageRange: '28-32', gender: 'female', quality: 'all',
    })).toBe(true)
    expect(matchesPortraitFilters(portrait, {
      status: 'all', appearance: 'all', ageGroup: 'adult', ageRange: '33-37', gender: 'all', quality: 'all',
    })).toBe(false)
    expect(matchesPortraitFilters({ status: 'needs-metadata' }, {
      status: 'all', appearance: 'all', ageGroup: 'adult', ageRange: 'all', gender: 'all', quality: 'all',
    })).toBe(false)
  })

  it('flags missing or invalid technical characteristics', () => {
    expect(isPortraitCompliant(portrait)).toBe(true)
    expect(isPortraitCompliant({ ...portrait, technical: { ...portrait.technical, bytes: 50_000 } })).toBe(false)
    expect(isPortraitCompliant({ ...portrait, technical: { ...portrait.technical, width: 480 } })).toBe(false)
    expect(isPortraitCompliant({ ...portrait, technical: undefined })).toBe(false)
    expect(matchesPortraitFilters({ ...portrait, technical: undefined }, {
      status: 'all', appearance: 'all', ageGroup: 'all', ageRange: 'all', gender: 'all', quality: 'noncompliant',
    })).toBe(true)
  })

  it('finds a portrait through any of its selected apparent-age bands', () => {
    const dual = { ...portrait, metadata: { ...portrait.metadata,
      apparentAgeRanges: [[28, 32], [33, 37], [38, 42]] } }
    const filters = { status: 'all', appearance: 'all', ageGroup: 'adult', gender: 'all', quality: 'all' }
    expect(matchesPortraitFilters(dual, { ...filters, ageRange: '28-32' })).toBe(true)
    expect(matchesPortraitFilters(dual, { ...filters, ageRange: '33-37' })).toBe(true)
    expect(matchesPortraitFilters(dual, { ...filters, ageRange: '38-42' })).toBe(true)
    expect(matchesPortraitFilters(dual, { ...filters, ageRange: '43-47' })).toBe(false)
  })

  it('filters production collections independently of appearance', () => {
    const item = { ...portrait, collection: 'europe-south' }
    const filters = { status: 'all', appearance: 'all', ageGroup: 'all', ageRange: 'all', gender: 'all', quality: 'all' }
    expect(matchesPortraitFilters(item, { ...filters, collection: 'europe-south' })).toBe(true)
    expect(matchesPortraitFilters(item, { ...filters, collection: 'europe-east' })).toBe(false)
    expect(matchesPortraitFilters(portrait, { ...filters, collection: 'unassigned' })).toBe(true)
  })
})
