import { Type, type Static } from 'typebox'
import {
  PublicCoordinatesSchema, PublicCountrySchema, PublicDobSchema, PublicLocationSchema,
  PublicLoginSchema, PublicNameSchema, PublicPersonSchema, PublicPictureSchema,
} from './public-person.js'

const MetaSchema = Type.Object({
  count: Type.Integer({ minimum: 1, maximum: 100 }),
  asOf: Type.String({ format: 'date' }),
  seed: Type.Union([Type.String({ minLength: 1, maxLength: 128 }), Type.Null()]),
  schemaVersion: Type.Literal('2'),
  dataVersion: Type.String({ minLength: 1 }),
  catalogVersion: Type.String({ minLength: 1 }),
  portraitContext: Type.Optional(Type.Union([
    Type.Literal('standard'), Type.Literal('doctor'), Type.Literal('construction'),
    Type.Literal('business'), Type.Literal('school-pupil'), Type.Literal('university-student'),
  ])),
  portraitSelectionVersion: Type.Optional(Type.String({ minLength: 1 })),
  portraitContexts: Type.Optional(Type.Array(Type.Union([
    Type.Literal('standard'), Type.Literal('doctor'), Type.Literal('construction'),
    Type.Literal('business'), Type.Literal('school-pupil'), Type.Literal('university-student'),
  ]), { maxItems: 6, uniqueItems: true })),
}, { additionalProperties: false })

export const PublicPeopleResponseSchema = Type.Object({
  results: Type.Array(PublicPersonSchema, { minItems: 1, maxItems: 100 }),
  meta: MetaSchema,
}, { $id: 'urn:persona:schema:people-response:v2', additionalProperties: false })

export const DefaultPublicPeopleResponseSchema = Type.Object({
  results: Type.Array(Type.Omit(PublicPersonSchema, ['login']), { minItems: 1, maxItems: 100 }),
  meta: MetaSchema,
}, { additionalProperties: false })

const ProjectedLocationSchema = Type.Object({
  ...Type.Partial(PublicLocationSchema).properties,
  country: Type.Optional(Type.Partial(PublicCountrySchema)),
  coordinates: Type.Optional(Type.Partial(PublicCoordinatesSchema)),
}, { additionalProperties: false })

const ProjectedPersonSchema = Type.Object({
  ...Type.Partial(PublicPersonSchema).properties,
  name: Type.Optional(Type.Partial(PublicNameSchema)),
  dob: Type.Optional(Type.Partial(PublicDobSchema)),
  location: Type.Optional(ProjectedLocationSchema),
  picture: Type.Optional(Type.Union([Type.Partial(PublicPictureSchema), Type.Null()])),
  login: Type.Optional(Type.Partial(PublicLoginSchema)),
}, { additionalProperties: false })

export const ProjectedPublicPeopleResponseSchema = Type.Object({
  results: Type.Array(ProjectedPersonSchema, { minItems: 1, maxItems: 100 }),
  meta: MetaSchema,
}, { additionalProperties: false })

export type PublicPeopleResponse = Static<typeof PublicPeopleResponseSchema>
export type DefaultPublicPeopleResponse = Static<typeof DefaultPublicPeopleResponseSchema>
export type ProjectedPublicPeopleResponse = Static<typeof ProjectedPublicPeopleResponseSchema>
