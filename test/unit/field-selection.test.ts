import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Value from 'typebox/value'
import { ProjectedPeopleResponseSchema } from '../../src/contracts/people.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { projectPeopleResponse } from '../../src/field-selection.js'

const fullResponse = JSON.parse(
  readFileSync(new URL('../../examples/people-response-v1.json', import.meta.url), 'utf8'),
)
const fieldsFrom = (query: string) => parsePeopleQuery(new URLSearchParams(query)).fields

describe('public field selection', () => {
  it('returns standard fields by default and excludes internal properties', () => {
    const response = structuredClone(fullResponse)
    response.results[0].internalCatalogKey = 'private-key'
    response.results[0].address.internalSource = 'private-address'
    response.results[0].picture.internalSource = 'private-portrait'
    const projected = projectPeopleResponse(response)

    const expected = structuredClone(fullResponse)
    delete expected.results[0].ageGroup
    delete expected.results[0].appearance
    expect(projected).toEqual(expected)
    expect(projected.results[0]).not.toHaveProperty('internalCatalogKey')
    expect(projected.results[0].address).not.toHaveProperty('internalSource')
    expect(projected.results[0].picture).not.toHaveProperty('internalSource')
    expect(Value.Check(ProjectedPeopleResponseSchema, projected)).toBe(true)
  })

  it('selects top-level and nested fields while preserving response metadata', () => {
    const fields = fieldsFrom('fields=firstName,city,picture.url,address.city')
    const projected = projectPeopleResponse(fullResponse, fields)

    expect(projected).toEqual({
      results: [{
        firstName: 'Chikondi',
        city: 'Lilongwe',
        picture: { url: fullResponse.results[0].picture.url },
        address: { city: 'Lilongwe' },
      }],
      meta: fullResponse.meta,
    })
    expect(Value.Check(ProjectedPeopleResponseSchema, projected)).toBe(true)
  })

  it('retains null when picture.url or a nullable field is selected', () => {
    const response = structuredClone(fullResponse)
    response.results[0].picture = null
    expect(projectPeopleResponse(response, fieldsFrom('fields=picture.url,phone')).results).toEqual([
      { picture: null, phone: null },
    ])
  })

  it('keeps both name components when they are selected without the full name', () => {
    const response = structuredClone(fullResponse)
    response.results[0].firstName = 'Aye Aye'
    response.results[0].lastName = 'Myint'
    response.results[0].fullName = 'Aye Aye Myint'
    response.results[0].country = 'MM'
    response.results[0].city = 'Yangon'
    response.results[0].address = { line1: '18 Example Road', city: 'Yangon', region: 'Yangon Region',
      postalCode: null, country: 'MM', formatted: '18 Example Road\nYangon\nMyanmar' }
    response.results[0].email = 'ayeaye.myint.0123456789ab@example.test'
    response.results[0].phone = null
    response.results[0].picture = null
    response.results[0].appearance = 'southeast-asian'
    const projected = projectPeopleResponse(response, fieldsFrom('fields=firstName,lastName,fullName'))
    expect(projected.results).toEqual([{ firstName: 'Aye Aye', lastName: 'Myint', fullName: 'Aye Aye Myint' }])
    expect(Value.Check(ProjectedPeopleResponseSchema, projected)).toBe(true)
  })

  it('rejects unknown, private, duplicate, and conflicting fields', () => {
    for (const fields of [
      'internalCatalogKey', 'picture.privateKey', 'address.foo', 'results',
      'firstName,firstName', 'picture,picture.url', 'address.city,address',
      'firstName,', '.city', 'picture.url.extra',
    ]) {
      expect(() => fieldsFrom(`fields=${fields}`)).toThrow(expect.objectContaining({
        code: 'INVALID_QUERY', parameter: 'fields',
      }))
    }
  })

  it('does not alter retained values or the source for the same generated response', () => {
    const before = structuredClone(fullResponse)
    const first = projectPeopleResponse(fullResponse, fieldsFrom('fields=firstName,address.city'))
    const second = projectPeopleResponse(fullResponse, fieldsFrom('fields=address.city,firstName,picture'))

    expect(first.results[0].firstName).toBe(second.results[0].firstName)
    expect(first.results[0].address).toEqual(second.results[0].address)
    expect(first.meta.seed).toBe(second.meta.seed)
    expect(fullResponse).toEqual(before)
  })
})
