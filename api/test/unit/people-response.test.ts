import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import Value from 'typebox/value'
import { isAgeProfileConsistent } from '../../src/age.js'
import { PeopleErrorSchema, PeopleResponseSchema } from '../../src/contracts/people.js'

it('accepts the published GET /people response example', () => {
  const example = JSON.parse(
    readFileSync(new URL('../../examples/people-response-v1.json', import.meta.url), 'utf8'),
  )

  expect(PeopleResponseSchema.$id).toBe('urn:persona:schema:people-response:v1')
  expect(Value.Check(PeopleResponseSchema, example)).toBe(true)
  expect(example.meta.count).toBe(example.results.length)
  expect(isAgeProfileConsistent(example.results[0], example.meta.asOf)).toBe(true)
  expect(Value.Check(PeopleResponseSchema, {
    ...example,
    results: [],
    meta: { ...example.meta, count: 0 },
  })).toBe(false)
})

it('keeps the public error envelope free of internal details', () => {
  expect(Value.Check(PeopleErrorSchema, {
    error: { code: 'INVALID_QUERY', message: 'age must be an integer', parameter: 'age' },
  })).toBe(true)
  expect(Value.Check(PeopleErrorSchema, {
    error: { code: 'RATE_LIMITED', message: 'Try again later' },
  })).toBe(true)
  expect(Value.Check(PeopleErrorSchema, {
    error: { code: 'INVALID_QUERY', message: 'Invalid request', stack: 'private stack trace' },
  })).toBe(false)
})
