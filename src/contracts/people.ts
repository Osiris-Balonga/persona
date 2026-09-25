import { Type, type Static } from 'typebox'
import { AddressSchema, PersonSchema, PictureSchema } from './person.js'

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

export const DefaultPeopleResponseSchema = Type.Object({
  results: Type.Array(Type.Omit(PersonSchema, ['ageGroup', 'appearance']), { minItems: 1, maxItems: 100 }),
  meta: PeopleResponseSchema.properties.meta,
}, { $id: 'urn:persona:schema:default-people-response:v1', additionalProperties: false })

const ProjectedPersonSchema = Type.Object({
  ...Type.Partial(PersonSchema).properties,
  address: Type.Optional(Type.Partial(AddressSchema)),
  picture: Type.Optional(Type.Union([Type.Partial(PictureSchema), Type.Null()])),
}, { additionalProperties: false })

export const ProjectedPeopleResponseSchema = Type.Object({
  results: Type.Array(ProjectedPersonSchema, { minItems: 1, maxItems: 100 }),
  meta: PeopleResponseSchema.properties.meta,
}, { $id: 'urn:persona:schema:projected-people-response:v1', additionalProperties: false })

export type ProjectedPeopleResponse = Static<typeof ProjectedPeopleResponseSchema>

export const PeopleErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    parameter: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
}, { $id: 'urn:persona:schema:people-error:v1', additionalProperties: false })
