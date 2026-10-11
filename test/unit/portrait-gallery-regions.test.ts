import { describe, expect, it } from 'vitest'
import { portraitRegion } from '../../review/gallery-regions.js'
import { matchesPortraitFilters } from '../../review/gallery-filters.js'

const filters = { status: 'all', appearance: 'all', collection: 'all', ageGroup: 'all', ageRange: 'all', gender: 'all', quality: 'all' }

describe('portrait gallery regions', () => {
  it('uses a documented production lot before the visual appearance', () => {
    const portrait = { collection: 'europe-west', metadata: { appearance: 'black' } }
    expect(portraitRegion(portrait)).toBe('europe-west')
    expect(matchesPortraitFilters(portrait, { ...filters, region: 'europe' })).toBe(true)
    expect(matchesPortraitFilters(portrait, { ...filters, region: 'europe-west' })).toBe(true)
    expect(matchesPortraitFilters(portrait, { ...filters, region: 'africa' })).toBe(false)
  })

  it('routes a Latin American brief to the Americas even with another visual appearance', () => {
    const portrait = { collection: 'americas-latin-caribbean', metadata: { appearance: 'black' } }
    expect(portraitRegion(portrait)).toBe('americas-latin-caribbean')
    expect(matchesPortraitFilters(portrait, { ...filters, region: 'americas' })).toBe(true)
    expect(matchesPortraitFilters(portrait, { ...filters, region: 'europe' })).toBe(false)
  })

  it('places legacy African and Asian briefs in their regions without treating black as African origin', () => {
    expect(portraitRegion({ metadata: { appearance: 'west-african' } })).toBe('africa-west')
    expect(portraitRegion({ originalName: 'indian-ocean-adult-female-01.png', metadata: { appearance: 'mixed' } })).toBe('africa-indian-ocean')
    expect(portraitRegion({ collection: 'africa-indian-ocean', metadata: { appearance: 'mixed' } })).toBe('africa-indian-ocean')
    expect(portraitRegion({ metadata: { appearance: 'east-asian' } })).toBe('asia-east')
    expect(portraitRegion({ metadata: { appearance: 'black' } })).toBe('unassigned')
    expect(portraitRegion({ metadata: { appearance: 'european' } })).toBe('unassigned')
  })
})
