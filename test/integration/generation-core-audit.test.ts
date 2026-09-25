import { describe, expect, it } from 'vitest'
import Value from 'typebox/value'
import { ageOn } from '../../src/age.js'
import { PersonSchema } from '../../src/contracts/person.js'
import { generatePersonWithoutPortrait } from '../../src/generation-core.js'
import { listCountries } from '../../src/geography/countries.js'
import { getCity } from '../../src/geography/cities.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { createGenerationContext } from '../../src/replay.js'

const versions = { dataVersion: 'geo-audit', catalogVersion: 'empty-v1' }

describe('generated geographic profiles', () => {
  it('builds a coherent schema-valid controlled sample for each available code', () => {
    const failures: string[] = []
    const countries = listCountries().filter(canGenerateProfile)
    for (const country of countries) {
      const query = parsePeopleQuery(new URLSearchParams(`country=${country.code}&ageGroup=teen&seed=core-audit&asOf=2025-02-28`))
      const person = generatePersonWithoutPortrait(query, createGenerationContext(query, versions), 0)
      if (!Value.Check(PersonSchema, { ...person, picture: null })
        || person.country !== country.code || !getCity(country.code, person.city)
        || person.address.country !== country.code || person.address.city !== person.city
        || ageOn(person.dateOfBirth, query.asOf) !== person.age
        || person.phone !== null && !person.phone.startsWith(country.callingCode ?? '')) {
        failures.push(country.code)
      }
    }
    expect(countries).toHaveLength(209)
    expect(failures).toEqual([])
  })
})
