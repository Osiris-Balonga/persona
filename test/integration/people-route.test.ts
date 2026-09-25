import { describe, expect, it } from 'vitest'
import Value from 'typebox/value'
import { buildApp } from '../../src/app.js'
import { DefaultPeopleResponseSchema } from '../../src/contracts/people.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'
import { listCountries } from '../../src/geography/countries.js'
import { canGenerateProfile } from '../../src/geography/profile-availability.js'

const base = '/people?country=MW&city=Lilongwe&age=14&gender=female&appearance=east-asian&seed=route-demo&asOf=2026-09-24'

describe('GET /people', () => {
  it('returns a valid person for every beta-available country code', async () => {
    const app = buildApp({ rateLimitMax: 300 })
    try {
      const countries = listCountries().filter(canGenerateProfile)
      expect(countries.length).toBeGreaterThan(200)
      for (const country of countries) {
        const response = await app.inject({ method: 'GET', url: `/people?country=${country.code}&seed=coverage&asOf=2026-09-24` })
        expect(response.statusCode, country.code).toBe(200)
        const body = response.json()
        expect(Value.Check(DefaultPeopleResponseSchema, body), country.code).toBe(true)
        expect(body.results[0].country, country.code).toBe(country.code)
      }
    } finally { await app.close() }
  })

  it('returns schema-valid seeded people and revalidates an identical ETag', async () => {
    const app = buildApp()
    try {
      const first = await app.inject({ method: 'GET', url: `${base}&count=2` })
      expect(first.statusCode).toBe(200)
      expect(first.headers['cache-control']).toBe('private, no-cache')
      expect(first.headers.etag).toMatch(/^"persona-v3-/)
      const body = first.json()
      expect(Value.Check(DefaultPeopleResponseSchema, body)).toBe(true)
      expect(body.results).toHaveLength(2)
      expect(body.results[0]).toMatchObject({ country: 'MW', city: 'Lilongwe', age: 14,
        gender: 'female', picture: null, address: { line1: expect.stringMatching(/^Area \d+, /) } })
      expect(body.results[0]).not.toHaveProperty('ageGroup')
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
      const base = '/people?country=MW&seed=diversity&asOf=2026-09-24'
      const response = await app.inject({ method: 'GET', url: `${base}&count=100` })
      expect(response.statusCode).toBe(200)
      const people = response.json().results
      expect(people).toHaveLength(100)
      expect(people.every((person: { age: number }) => person.age >= 6 && person.age <= 120)).toBe(true)
      expect(new Set(people.map((person: { id: string }) => person.id)).size).toBe(100)
      const counts = new Map<string, number>()
      for (const person of people) counts.set(person.fullName, (counts.get(person.fullName) ?? 0) + 1)
      expect(counts.size).toBe(20)
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(8)
      const first = (await app.inject({ method: 'GET', url: `${base}&count=1` })).json().results[0]
      expect(people[0]).toEqual(first)
      const invalid = await app.inject({ method: 'GET', url: '/people?age=5' })
      expect(invalid.statusCode).toBe(400)
      expect(invalid.json().error).toMatchObject({ code: 'INVALID_QUERY', parameter: 'age' })
    } finally { await app.close() }
  })

  it('projects nested fields after generation and retains metadata', async () => {
    const app = buildApp()
    try {
      const full = (await app.inject({ method: 'GET', url: base })).json()
      const projected = await app.inject({ method: 'GET', url: `${base}&fields=firstName,address.city,picture.url` })
      expect(projected.statusCode).toBe(200)
      expect(projected.json()).toEqual({ results: [{ firstName: full.results[0].firstName,
        address: { city: 'Lilongwe' }, picture: null }], meta: full.meta })
    } finally { await app.close() }
  })

  it('returns safe errors and no-store for invalid or non-replayable requests', async () => {
    const app = buildApp()
    try {
      const unavailable = await app.inject({ method: 'GET', url: '/people?country=PN' })
      expect(unavailable.statusCode).toBe(400)
      expect(unavailable.headers['cache-control']).toBe('no-store')
      expect(unavailable.json().error).toMatchObject({ code: 'UNSUPPORTED_VALUE', parameter: 'country' })
      const conflict = await app.inject({ method: 'GET', url: '/people?age=14&ageGroup=adult' })
      expect(conflict.statusCode).toBe(400)
      expect(conflict.json().error.code).toBe('CONFLICTING_FILTERS')
      const random = await app.inject({ method: 'GET', url: '/people?country=MW' })
      expect(random.statusCode).toBe(200)
      expect(random.headers['cache-control']).toBe('no-store')
      expect(random.headers.etag).toBeUndefined()
      expect(random.json().meta.seed).toBeNull()
      const implicitDate = await app.inject({ method: 'GET', url: '/people?country=MW&seed=demo' })
      expect(implicitDate.headers['cache-control']).toBe('no-store')
    } finally { await app.close() }
  })

  it('uses distinct compatible approved portraits when the fixture has enough', async () => {
    const catalog: PortraitCatalog = { version: 'v1', publicBaseUrl: 'https://images.example.test', assets: [1, 2].map((number) => ({
      id: `p_000${number}`, catalogVersion: 'v1', ageGroup: 'teen', gender: 'female',
      visualGroup: 'east-asian', appearance: 'east-asian', rights: 'project-owned synthetic image',
      sha256: `${'a'.repeat(63)}${number}`, reviewStatus: 'approved',
      objectKey: `portraits/v1/teen/female/east-asian/east-asian/p_000${number}.webp`,
    })) }
    const app = buildApp({ portraitCatalog: catalog })
    try {
      const response = await app.inject({ method: 'GET', url: `${base}&count=2` })
      expect(response.statusCode).toBe(200)
      const pictures = response.json().results.map((person: { picture: { url: string } }) => person.picture.url)
      expect(new Set(pictures).size).toBe(2)
      expect(pictures.every((url: string) => url.startsWith('https://images.example.test/portraits/v1/teen/female/east-asian/east-asian/'))).toBe(true)
    } finally { await app.close() }
  })
})
