import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Value from 'typebox/value'
import {
  DefaultPublicPeopleResponseSchema, ProjectedPublicPeopleResponseSchema,
} from '../../src/contracts/public-people.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { projectPeopleResponse } from '../../src/field-selection.js'

const fullResponse = JSON.parse(
  readFileSync(new URL('../../examples/people-response-v1.json', import.meta.url), 'utf8'),
)
const fieldsFrom = (query: string) => parsePeopleQuery(new URLSearchParams(query)).fields

describe('public field selection', () => {
  it('returns the public v2 shape by default without internal fields or login', () => {
    const response = structuredClone(fullResponse)
    response.results[0].internalCatalogKey = 'private-key'
    response.results[0].address.internalSource = 'private-address'
    response.results[0].picture.internalSource = 'private-portrait'
    const projected = projectPeopleResponse(response)

    expect(projected.results[0]).toMatchObject({
      name: { first: 'Chimwemwe', last: 'Banda', full: 'Chimwemwe Banda' },
      nationality: 'MW',
      location: { city: 'Lilongwe', country: { code: 'MW' }, street: '4 Nkhoma Street' },
      picture: {
        large: 'https://persona-portraits.osirisbalonga.workers.dev/portraits/v1/large/p_0049.webp',
        medium: 'https://persona-portraits.osirisbalonga.workers.dev/portraits/v1/medium/p_0049.webp',
        thumbnail: 'https://persona-portraits.osirisbalonga.workers.dev/portraits/v1/thumbnail/p_0049.webp',
      },
    })
    expect(projected.results[0]).not.toHaveProperty('login')
    expect(projected.results[0]).not.toHaveProperty('internalCatalogKey')
    expect(projected.results[0]).not.toHaveProperty('address')
    expect(projected.meta.schemaVersion).toBe('2')
    expect(Value.Check(DefaultPublicPeopleResponseSchema, projected)).toBe(true)
  })

  it('selects nested fields while preserving response metadata', () => {
    const full = projectPeopleResponse(fullResponse)
    const fields = fieldsFrom('fields=name.first,location.city,picture.thumbnail')
    const projected = projectPeopleResponse(fullResponse, fields)
    expect(projected).toEqual({
      results: [{ name: { first: 'Chimwemwe' }, location: { city: 'Lilongwe' },
        picture: { thumbnail: full.results[0].picture?.thumbnail } }],
      meta: full.meta,
    })
    expect(Value.Check(ProjectedPublicPeopleResponseSchema, projected)).toBe(true)
  })

  it('retains null when a picture rendition or a nullable field is selected', () => {
    const response = structuredClone(fullResponse)
    response.results[0].picture = null
    expect(projectPeopleResponse(response, fieldsFrom('fields=picture.thumbnail,phone')).results).toEqual([
      { picture: null, phone: null },
    ])
  })

  it('keeps first and last names separately and allows explicit demo login fields', () => {
    const response = structuredClone(fullResponse)
    response.results[0].firstName = 'Aye Aye'
    response.results[0].lastName = 'Myint'
    response.results[0].fullName = 'Aye Aye Myint'
    response.results[0].country = 'MM'
    response.results[0].city = 'Yangon'
    response.results[0].address = { line1: '18 Example Road', city: 'Yangon', region: 'Yangon Region',
      postalCode: null, country: 'MM', formatted: '18 Example Road\nYangon\nMyanmar' }
    response.results[0].email = 'am.example@example.test'
    response.results[0].phone = null
    response.results[0].picture = null
    const projected = projectPeopleResponse(response, fieldsFrom('fields=name.first,name.last,login.username'))
    expect(projected.results).toEqual([{
      name: { first: 'Aye Aye', last: 'Myint' }, login: { username: 'amexample' },
    }])
    expect(Value.Check(ProjectedPublicPeopleResponseSchema, projected)).toBe(true)
  })

  it('rejects unknown, private, duplicate, and conflicting fields', () => {
    for (const fields of [
      'internalCatalogKey', 'picture.privateKey', 'location.foo', 'results',
      'name.first,name.first', 'picture,picture.large', 'location.city,location',
      'name.first,', '.city', 'picture.large.extra',
    ]) {
      expect(() => fieldsFrom(`fields=${fields}`)).toThrow(expect.objectContaining({
        code: 'INVALID_QUERY', parameter: 'fields',
      }))
    }
  })

  it('does not alter retained values or the source for the same generated response', () => {
    const before = structuredClone(fullResponse)
    const first = projectPeopleResponse(fullResponse, fieldsFrom('fields=name.first,location.city'))
    const second = projectPeopleResponse(fullResponse, fieldsFrom('fields=location.city,name.first,picture'))

    expect(first.results[0].name?.first).toBe(second.results[0].name?.first)
    expect(first.results[0].location).toEqual(second.results[0].location)
    expect(first.meta.seed).toBe(second.meta.seed)
    expect(fullResponse).toEqual(before)
  })
})
