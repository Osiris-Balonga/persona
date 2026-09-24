import { Type, type Static } from 'typebox'
import { PersonSchema } from './person.js'

export const PeopleResponseSchema = Type.Object({
  results: Type.Array(PersonSchema, { minItems: 1, maxItems: 100 }),
  meta: Type.Object({
    count: Type.Integer({ minimum: 1, maximum: 100 }),
    asOf: Type.String({ format: 'date' }),
    seed: Type.Union([Type.String({ minLength: 1, maxLength: 128 }), Type.Null()]),
    dataVersion: Type.String({ minLength: 1 }),
    catalogVersion: Type.String({ minLength: 1 }),
  }, { additionalProperties: false }),
}, { $id: 'urn:persona:schema:people-response:v1', additionalProperties: false })

export type PeopleResponse = Static<typeof PeopleResponseSchema>

export const PeopleErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    parameter: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
}, { $id: 'urn:persona:schema:people-error:v1', additionalProperties: false })
