import { Type, type Static } from 'typebox'

const code = Type.String({ pattern: '^[A-Z]{2}$' })
const httpsUrl = Type.String({ format: 'uri', pattern: '^https://' })

export const PublicNameSchema = Type.Object({
  first: Type.String({ minLength: 1 }),
  last: Type.String({ minLength: 1 }),
  full: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const PublicDobSchema = Type.Object({
  date: Type.String({ format: 'date' }),
  age: Type.Integer({ minimum: 6, maximum: 100 }),
  ageGroup: Type.Union([
    Type.Literal('child'), Type.Literal('teen'), Type.Literal('adult'), Type.Literal('senior'),
  ]),
}, { additionalProperties: false })

export const PublicCountrySchema = Type.Object({
  code,
  name: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const PublicCoordinatesSchema = Type.Object({
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  precision: Type.Literal('city'),
}, { additionalProperties: false })

export const PublicLocationSchema = Type.Object({
  street: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  city: Type.String({ minLength: 1 }),
  state: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  country: PublicCountrySchema,
  postcode: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  coordinates: PublicCoordinatesSchema,
  formatted: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const PublicPictureSchema = Type.Object({
  large: httpsUrl,
  medium: httpsUrl,
  thumbnail: httpsUrl,
}, { additionalProperties: false })

export const PublicLoginSchema = Type.Object({
  username: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 1 }),
}, { additionalProperties: false })

export const PublicPersonSchema = Type.Object({
  id: Type.String({ pattern: '^per_[A-Za-z0-9_-]+$' }),
  gender: Type.Union([Type.Literal('male'), Type.Literal('female')]),
  name: PublicNameSchema,
  nationality: code,
  dob: PublicDobSchema,
  location: PublicLocationSchema,
  email: Type.String({ format: 'email' }),
  phone: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  picture: Type.Union([PublicPictureSchema, Type.Null()]),
  login: Type.Optional(PublicLoginSchema),
}, { $id: 'urn:persona:schema:public-person:v2', additionalProperties: false })

export type PublicPerson = Static<typeof PublicPersonSchema>
