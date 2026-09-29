import { describe, expect, it } from 'vitest'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { buildApp } from '../../src/app.js'
import { getCity } from '../../src/geography/cities.js'
import { m49RegionByCountry } from '../../src/geography/m49-region-data.js'

const replay = 'seed=contract-review&asOf=2026-09-28'

describe('proposed public people contract', () => {
  it('separates nationality from residence and keeps location tied to the selected city', async () => {
    const app = buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: `/people?nationality=FR&residenceCountry=CG&city=Brazzaville&${replay}` })
      expect(response.statusCode).toBe(200)
      const person = response.json().results[0]
      const city = getCity('CG', 'Brazzaville')!
      expect(person.nationality).toBe('FR')
      expect(person.location).toMatchObject({
        street: expect.any(String), city: city.name, state: city.region,
        country: { code: 'CG', name: expect.any(String) }, postcode: null,
        coordinates: { latitude: city.latitude, longitude: city.longitude, precision: 'city' },
      })
      expect(person.location.formatted).toContain(city.name)
      expect(person).not.toHaveProperty('address')
      expect(person).not.toHaveProperty('firstName')
      expect(person.name).toEqual({ first: expect.any(String), last: expect.any(String), full: expect.any(String) })
      expect(person.dob).toEqual({ date: expect.any(String), age: expect.any(Number), ageGroup: expect.any(String) })
      expect(person.phone).toMatch(/^\+242\d+$/)
      expect(parsePhoneNumberFromString(person.phone)?.country).toBe('CG')
    } finally { await app.close() }
  })

  it('uses continent to constrain nationality, including when residence is elsewhere', async () => {
    const app = buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: `/people?continent=africa&residenceCountry=FR&city=Paris&count=8&${replay}` })
      expect(response.statusCode).toBe(200)
      for (const person of response.json().results) {
        expect(m49RegionByCountry[person.nationality]?.[0]).toBe('002')
        expect(person.location.country.code).toBe('FR')
        expect(person.location.city).toBe('Paris')
      }
      const conflict = await app.inject({ method: 'GET', url: '/people?continent=africa&nationality=FR' })
      expect(conflict.statusCode).toBe(400)
      expect(conflict.json().error.code).toBe('CONFLICTING_FILTERS')
    } finally { await app.close() }
  })

  it('accepts several age groups but no exact age or public appearance filter', async () => {
    const app = buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: `/people?nationality=FR&ageGroup=adult,senior&count=8&${replay}` })
      expect(response.statusCode).toBe(200)
      expect(response.json().results.every((person: { dob: { age: number; ageGroup: string } }) =>
        person.dob.age >= 18 && person.dob.age <= 100 && ['adult', 'senior'].includes(person.dob.ageGroup))).toBe(true)
      for (const parameter of ['age=30', 'appearance=black', 'ageGroup=adult,adult', 'ageGroup=unknown']) {
        const rejected = await app.inject({ method: 'GET', url: `/people?${parameter}` })
        expect(rejected.statusCode, parameter).toBe(400)
      }
    } finally { await app.close() }
  })

  it('generates a short initial-based email on a selected domain and keeps login opt-in', async () => {
    const app = buildApp()
    try {
      const base = `/people?nationality=FR&emailDomain=yopmail.com&count=12&${replay}`
      const response = await app.inject({ method: 'GET', url: base })
      expect(response.statusCode).toBe(200)
      const people = response.json().results
      expect(new Set(people.map((person: { email: string }) => person.email)).size).toBe(people.length)
      for (const person of people) {
        expect(person.email).toMatch(/^[a-z0-9]\.([a-z0-9]+)\.[a-z0-9]{1,5}@yopmail\.com$/)
        expect(person).not.toHaveProperty('login')
      }
      const withLogin = await app.inject({ method: 'GET', url: `${base}&fields=name,email,login` })
      expect(withLogin.statusCode).toBe(200)
      expect(withLogin.json().results[0]).toMatchObject({
        name: people[0].name, email: people[0].email,
        login: { username: expect.any(String), password: expect.any(String) },
      })
      expect(withLogin.json().results[0]).not.toHaveProperty('location')
      const defaultDomain = await app.inject({ method: 'GET', url: `/people?nationality=FR&count=12&${replay}` })
      expect(defaultDomain.statusCode).toBe(200)
      expect(defaultDomain.json().results.map((person: { id: string; picture: unknown }) => [person.id, person.picture]))
        .toEqual(people.map((person: { id: string; picture: unknown }) => [person.id, person.picture]))
      for (const domain of ['http://example.com', 'user@gmail.com', 'localhost']) {
        const rejected = await app.inject({ method: 'GET', url: `/people?emailDomain=${encodeURIComponent(domain)}` })
        expect(rejected.statusCode, domain).toBe(400)
      }
    } finally { await app.close() }
  })

  it('projects nested v2 fields without changing retained seeded values', async () => {
    const app = buildApp()
    try {
      const base = `/people?nationality=FR&residenceCountry=CG&city=Brazzaville&${replay}`
      const full = await app.inject({ method: 'GET', url: base })
      expect(full.statusCode).toBe(200)
      const person = full.json().results[0]
      const selected = await app.inject({ method: 'GET',
        url: `${base}&fields=name.first,location.city,location.coordinates.latitude,picture.thumbnail` })
      expect(selected.statusCode).toBe(200)
      expect(selected.json().results[0]).toEqual({
        name: { first: person.name.first },
        location: { city: person.location.city, coordinates: { latitude: person.location.coordinates.latitude } },
        picture: person.picture === null ? null : { thumbnail: person.picture.thumbnail },
      })
      const conflict = await app.inject({ method: 'GET', url: `${base}&fields=location,location.city` })
      expect(conflict.statusCode).toBe(400)
    } finally { await app.close() }
  })
})
