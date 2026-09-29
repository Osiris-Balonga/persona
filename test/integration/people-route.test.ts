import { describe, expect, it } from 'vitest'
import Value from 'typebox/value'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { buildApp } from '../../src/app.js'
import { DefaultPublicPeopleResponseSchema } from '../../src/contracts/public-people.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'
import { listCountries } from '../../src/geography/countries.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'

const base = '/people?nationality=MW&city=Lilongwe&ageGroup=teen&gender=female&seed=route-demo&asOf=2026-09-24'

describe('GET /people', () => {
  it('never uses a portrait from another collection for a selected country', async () => {
    const catalog: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [{
      id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
      ageGroup: 'adult', apparentAgeRanges: [[28, 32]], gender: 'female',
      visualGroup: 'black', appearance: 'central-african', appearanceTags: ['black'],
      collection: 'africa-east', rights: 'Synthetic portrait generated for Persona',
      sha256: 'a'.repeat(64), reviewStatus: 'approved',
    }] }
    const app = buildApp({ portraitCatalog: catalog })
    try {
      const response = await app.inject({ method: 'GET',
        url: '/people?nationality=CG&ageGroup=adult&gender=female&seed=collection-check&asOf=2026-09-26' })
      expect(response.statusCode).toBe(200)
      expect(response.json().results[0].picture).toBeNull()
    } finally { await app.close() }
  })

  it('returns a strictly valid country-format fallback number', async () => {
    const app = buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/people?nationality=CG&city=Brazzaville&seed=phone-safety&asOf=2026-09-24' })
      expect(response.statusCode).toBe(200)
      const phone = parsePhoneNumberFromString(response.json().results[0].phone)
      expect(phone?.country).toBe('CG')
      expect(phone?.isValid()).toBe(true)
    } finally { await app.close() }
  })

  it('returns a valid person for every beta-available country code', async () => {
    const app = buildApp({ rateLimitMax: 300 })
    try {
      const countries = listCountries().filter(canGenerateProfile)
      expect(countries.length).toBeGreaterThan(200)
      for (const country of countries) {
        const response = await app.inject({ method: 'GET', url: `/people?nationality=${country.code}&seed=coverage&asOf=2026-09-24` })
        expect(response.statusCode, country.code).toBe(200)
        const body = response.json()
        expect(Value.Check(DefaultPublicPeopleResponseSchema, body), country.code).toBe(true)
        expect(body.results[0].nationality, country.code).toBe(country.code)
      }
    } finally { await app.close() }
  })

  it('returns schema-valid seeded people and revalidates an identical ETag', async () => {
    const app = buildApp()
    try {
      const first = await app.inject({ method: 'GET', url: `${base}&count=2` })
      expect(first.statusCode).toBe(200)
      expect(first.headers['cache-control']).toBe('private, no-cache')
      expect(first.headers.etag).toMatch(/^"persona-v5-/)
      const body = first.json()
      expect(Value.Check(DefaultPublicPeopleResponseSchema, body)).toBe(true)
      expect(body.results).toHaveLength(2)
      expect(body.results[0]).toMatchObject({ nationality: 'MW',
        dob: { age: expect.any(Number), ageGroup: 'teen' }, gender: 'female',
        location: { city: 'Lilongwe', street: expect.stringMatching(/^\d{1,3} .+ (?:Road|Street|Avenue)$/) } })
      expect(body.results[0].dob.age).toBeGreaterThanOrEqual(13)
      expect(body.results[0].dob.age).toBeLessThanOrEqual(17)
      expect(body.results[0].picture?.large).toMatch(/^https:\/\/persona-portraits\.osirisbalonga\.workers\.dev\/portraits\/v1\/large\/p_\d+\.webp$/)
      expect(body.results[0]).not.toHaveProperty('age')
      expect(body.results[0]).not.toHaveProperty('appearance')
      expect(body.results[0].id).not.toBe(body.results[1].id)
      expect((await app.inject({ method: 'GET', url: `${base}&count=2` })).json()).toEqual(body)
      const unchanged = await app.inject({ method: 'GET', url: `${base}&count=2`,
        headers: { 'if-none-match': String(first.headers.etag) } })
      expect(unchanged.statusCode).toBe(304)
      expect(unchanged.body).toBe('')
      expect(unchanged.headers['cache-control']).toBe('private, no-cache')
    } finally { await app.close() }
  })

  it('keeps bulk identities distinct where possible and respects the minimum age', async () => {
    const app = buildApp()
    try {
      const base = '/people?nationality=MW&seed=diversity&asOf=2026-09-24'
      const response = await app.inject({ method: 'GET', url: `${base}&count=100` })
      expect(response.statusCode).toBe(200)
      const people = response.json().results
      expect(people).toHaveLength(100)
      expect(people.every((person: { dob: { age: number } }) => person.dob.age >= 6 && person.dob.age <= 100)).toBe(true)
      expect(new Set(people.map((person: { id: string }) => person.id)).size).toBe(100)
      const counts = new Map<string, number>()
      for (const person of people) counts.set(person.name.full, (counts.get(person.name.full) ?? 0) + 1)
      expect(counts.size).toBe(20)
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(8)
      const first = (await app.inject({ method: 'GET', url: `${base}&count=1` })).json().results[0]
      expect(people[0]).toEqual(first)
      const invalid = await app.inject({ method: 'GET', url: '/people?age=5' })
      expect(invalid.statusCode).toBe(400)
      expect(invalid.json().error).toMatchObject({ code: 'INVALID_QUERY', parameter: 'age' })
      const seniors = await app.inject({ method: 'GET', url: `${base}&ageGroup=senior&count=10` })
      expect(seniors.statusCode).toBe(200)
      expect(seniors.json().results.every((person: { dob: { age: number } }) =>
        person.dob.age >= 65 && person.dob.age <= 100)).toBe(true)
      const excessive = await app.inject({ method: 'GET', url: '/people?age=101' })
      expect(excessive.statusCode).toBe(400)
      expect(excessive.json().error).toMatchObject({ code: 'INVALID_QUERY', parameter: 'age' })
    } finally { await app.close() }
  })

  it('projects nested fields after generation and retains metadata', async () => {
    const app = buildApp()
    try {
      const full = (await app.inject({ method: 'GET', url: base })).json()
      const projected = await app.inject({ method: 'GET', url: `${base}&fields=name.first,location.city,picture.thumbnail` })
      expect(projected.statusCode).toBe(200)
      expect(projected.json()).toEqual({ results: [{ name: { first: full.results[0].name.first },
        location: { city: 'Lilongwe' }, picture: full.results[0].picture === null
          ? null : { thumbnail: full.results[0].picture.thumbnail } }], meta: full.meta })
    } finally { await app.close() }
  })

  it('returns safe errors and no-store for invalid or non-replayable requests', async () => {
    const app = buildApp()
    try {
      const unavailable = await app.inject({ method: 'GET', url: '/people?nationality=PN' })
      expect(unavailable.statusCode).toBe(400)
      expect(unavailable.headers['cache-control']).toBe('no-store')
      expect(unavailable.json().error).toMatchObject({ code: 'UNSUPPORTED_VALUE', parameter: 'nationality' })
      const conflict = await app.inject({ method: 'GET', url: '/people?continent=africa&nationality=FR' })
      expect(conflict.statusCode).toBe(400)
      expect(conflict.json().error.code).toBe('CONFLICTING_FILTERS')
      const random = await app.inject({ method: 'GET', url: '/people?nationality=MW' })
      expect(random.statusCode).toBe(200)
      expect(random.headers['cache-control']).toBe('no-store')
      expect(random.headers.etag).toBeUndefined()
      expect(random.json().meta.seed).toBeNull()
      const implicitDate = await app.inject({ method: 'GET', url: '/people?nationality=MW&seed=demo' })
      expect(implicitDate.headers['cache-control']).toBe('no-store')
    } finally { await app.close() }
  })

  it('uses distinct compatible approved portraits when the fixture has enough', async () => {
    const catalog: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [1, 2].map((number) => ({
      id: `p_000${number}`, catalogVersion: 'v1', ageGroup: 'teen', gender: 'female',
      apparentAgeRanges: [[13, 15], [16, 17]],
      collection: 'africa-east', visualGroup: 'east-asian', appearance: 'east-asian', rights: 'project-owned synthetic image',
      sha256: `${'a'.repeat(63)}${number}`, reviewStatus: 'approved',
      objectKey: `portraits/v1/teen/female/east-asian/east-asian/p_000${number}.webp`,
    })) }
    const app = buildApp({ portraitCatalog: catalog })
    try {
      const response = await app.inject({ method: 'GET', url: `${base}&count=2` })
      expect(response.statusCode).toBe(200)
      const pictures = response.json().results.map((person: { picture: { large: string } }) => person.picture.large)
      expect(new Set(pictures).size).toBe(2)
      expect(pictures.every((url: string) => url.startsWith('https://images.example.test/portraits/v1/large/'))).toBe(true)
    } finally { await app.close() }
  })

  it('uses several consecutive bands when a portrait crosses from teen to adult', async () => {
    const catalog: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [{
      id: 'p_0001', catalogVersion: 'v1', ageGroup: 'teen', apparentAgeRanges: [[16, 17], [18, 22], [23, 27]],
      gender: 'female', collection: 'africa-east', visualGroup: 'east-asian', appearance: 'east-asian',
      rights: 'project-owned synthetic image', sha256: 'a'.repeat(64), reviewStatus: 'approved',
      objectKey: 'portraits/v1/teen/female/east-asian/east-asian/p_0001.webp',
    }] }
    const app = buildApp({ portraitCatalog: catalog })
    try {
      const teen = await app.inject({ method: 'GET', url: `${base}&count=60` })
      const adult = await app.inject({ method: 'GET', url: `${base.replace('ageGroup=teen', 'ageGroup=adult')}&count=60` })
      expect(teen.statusCode).toBe(200)
      expect(adult.statusCode).toBe(200)
      const people = [...teen.json().results, ...adult.json().results]
      for (const [minimum, maximum] of [[16, 17], [18, 22], [23, 27]] as const) {
        const inBand = people.filter((person) => person.dob.age >= minimum && person.dob.age <= maximum)
        expect(inBand.length, `${minimum}-${maximum}`).toBeGreaterThan(0)
        expect(inBand.every((person) => person.picture?.large.endsWith('/p_0001.webp'))).toBe(true)
      }
      const outside = people.filter((person) => person.dob.age >= 28)
      expect(outside.length).toBeGreaterThan(0)
      expect(outside.every((person) => person.picture === null)).toBe(true)
    } finally { await app.close() }
  })
})
