import { Type, type Static } from 'typebox'

const CountryCode = Type.String({ pattern: '^[A-Z]{2}$' })

const Address = Type.Object({
  line1: Type.String({ minLength: 1 }),
  city: Type.String({ minLength: 1 }),
  postalCode: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  country: CountryCode,
}, { additionalProperties: false })

const Picture = Type.Object({
  url: Type.String({ format: 'uri', pattern: '^https://' }),
}, { additionalProperties: false })

export const PersonSchema = Type.Object({
  id: Type.String({ pattern: '^per_[A-Za-z0-9_-]+$' }),
  firstName: Type.String({ minLength: 1 }),
  lastName: Type.String({ minLength: 1 }),
  fullName: Type.String({ minLength: 1 }),
  gender: Type.Union([Type.Literal('male'), Type.Literal('female')]),
  age: Type.Integer({ minimum: 0 }),
  ageGroup: Type.Union([
    Type.Literal('child'),
    Type.Literal('teen'),
    Type.Literal('adult'),
    Type.Literal('senior'),
  ]),
  dateOfBirth: Type.String({ format: 'date' }),
  appearance: Type.String({ minLength: 1 }),
  country: CountryCode,
  city: Type.String({ minLength: 1 }),
  address: Address,
  email: Type.String({ format: 'email', pattern: '@example\\.test$' }),
  phone: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  picture: Type.Union([Picture, Type.Null()]),
}, { $id: 'urn:persona:schema:person:v1', additionalProperties: false })

export type Person = Static<typeof PersonSchema>
