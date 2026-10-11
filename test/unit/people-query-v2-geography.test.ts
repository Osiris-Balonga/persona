import { describe, expect, it } from 'vitest'
import { parsePeopleQuery } from '../../src/people-query.js'
import { getCity } from '../../src/geography/cities.js'
import { continentForCountry } from '../../src/geography/continents.js'
import { generatePersonWithoutPortrait } from '../../src/generation-core.js'
import { createGenerationContext, responseETag } from '../../src/replay.js'

const versions = { dataVersion: 'geo-v2', catalogVersion: 'portrait-v2' }
const parse = (value: string) => parsePeopleQuery(new URLSearchParams(value), new Date('2026-09-28T00:00:00Z'))

describe('v2 geographic generation inputs', () => {
  it('copies a sole country filter and canonicalizes selected groups and cities', () => {
    expect(parse('nationality=FR&city=paris&ageGroup=senior,adult')).toMatchObject({
      nationality: 'FR', residenceCountry: 'FR', city: 'Paris', ageGroup: ['adult', 'senior'],
    })
    expect(parse('residenceCountry=FR')).toMatchObject({ nationality: 'FR', residenceCountry: 'FR' })
    expect(() => parse('nationality=FR&continent=africa')).toThrow(expect.objectContaining({
      code: 'CONFLICTING_FILTERS', parameter: 'continent',
    }))
    expect(() => parse('ageGroup=adult,adult')).toThrow(expect.objectContaining({ parameter: 'ageGroup' }))
  })

  it('permits a residence with a city but no reviewed name pool', () => {
    const query = parse('nationality=FR&residenceCountry=PN&city=Adamstown&seed=review')
    const person = generatePersonWithoutPortrait(query, createGenerationContext(query, versions), 0)
    expect(person.country).toBe('FR')
    expect(person.address.country).toBe('PN')
    expect(person.locationCity).toEqual(getCity('PN', 'Adamstown'))
    expect(() => parse('nationality=PN')).toThrow(expect.objectContaining({ parameter: 'nationality' }))
  })

  it('constrains nationality by continent and leaves the explicit residence untouched', () => {
    const query = parse('continent=africa&residenceCountry=FR&city=Paris&seed=review')
    const person = generatePersonWithoutPortrait(query, createGenerationContext(query, versions), 0)
    expect(continentForCountry(person.country)).toBe('africa')
    expect(person.address.country).toBe('FR')
    expect(person.locationCity).toEqual(getCity('FR', 'Paris'))
  })

  it('draws one shared country when neither country is specified', () => {
    const query = parse('seed=shared-country')
    const person = generatePersonWithoutPortrait(query, createGenerationContext(query, versions), 0)
    expect(person.country).toBe(person.address.country)
    expect(person.locationCity.country).toBe(person.country)
  })

  it('keeps identity keys independent of count, fields, and email domain', () => {
    const base = parse('nationality=FR&seed=review&ageGroup=adult,senior')
    const changed = parse('nationality=FR&seed=review&ageGroup=senior,adult&count=10&emailDomain=yopmail.com')
    const baseContext = createGenerationContext(base, versions)
    const changedContext = createGenerationContext(changed, versions)
    for (const component of ['identity', 'portrait', 'geography']) {
      expect(changedContext.componentKey(0, component)).toBe(baseContext.componentKey(0, component))
    }
    expect(responseETag(changed, versions)).not.toBe(responseETag(base, versions))
  })
})
