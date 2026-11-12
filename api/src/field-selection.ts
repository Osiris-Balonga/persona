import { createHash } from 'node:crypto'
import type { GeneratedPerson, GeneratedPeopleResponse } from './generated-person.js'
import { PublicPersonSchema, type PublicPerson } from './contracts/public-person.js'
import type { DefaultPublicPeopleResponse, ProjectedPublicPeopleResponse } from './contracts/public-people.js'
import { getCity } from './geography/cities.js'
import { getCountry } from './geography/countries.js'

type Paths<T> = { [Key in keyof T & string]: NonNullable<T[Key]> extends object
  ? Key | `${Key}.${Paths<NonNullable<T[Key]>>}` : Key }[keyof T & string]
export type FieldPath = Paths<PublicPerson>

const publicFields = Object.keys(PublicPersonSchema.properties)
export const defaultPersonFields: readonly FieldPath[] = [
  'id', 'gender', 'name', 'nationality', 'dob', 'location', 'email', 'phone', 'picture',
]
const nestedFields: Readonly<Record<string, readonly string[]>> = {
  name: ['first', 'last', 'full'],
  dob: ['date', 'age', 'ageGroup'],
  location: ['street', 'city', 'state', 'country', 'postcode', 'coordinates', 'formatted'],
  'location.country': ['code', 'name'],
  'location.coordinates': ['latitude', 'longitude', 'precision'],
  picture: ['large', 'medium', 'thumbnail'],
  login: ['username', 'password'],
}

function isFieldPath(field: string): field is FieldPath {
  const parts = field.split('.')
  return parts.length === 1 ? publicFields.includes(field)
    : nestedFields[parts.slice(0, -1).join('.')]?.includes(parts.at(-1) ?? '') === true
}

export function parseFieldSelection(value: string): readonly FieldPath[] {
  const fields = value.split(',').map((field) => field.trim())
  const seen = new Set<string>()
  for (const field of fields) {
    if (!isFieldPath(field)) throw new Error(`Unknown public field: ${field || '(empty)'}`)
    if (seen.has(field)) throw new Error(`Repeated field: ${field}`)
    if (fields.some((other) => other !== field &&
      (other.startsWith(`${field}.`) || field.startsWith(`${other}.`)))) {
      throw new Error(`Conflicting fields: ${field} and a nested field`)
    }
    seen.add(field)
  }
  return fields.filter(isFieldPath)
}

function pictureRenditions(picture: GeneratedPerson['picture']): PublicPerson['picture'] {
  if (picture === null) return null
  const source = new URL(picture.url)
  const match = /^\/portraits\/([a-z][a-z0-9-]*)\/(?:.*\/)?(p_\d{4,}\.webp)$/.exec(source.pathname)
  if (!match) throw new RangeError('Unexpected portrait URL')
  const base = `${source.origin}/portraits/${match[1]}`
  const file = match[2]
  return {
    large: `${base}/large/${file}`,
    medium: `${base}/medium/${file}`,
    thumbnail: `${base}/thumbnail/${file}`,
  }
}

function publicPerson(person: GeneratedPerson): PublicPerson {
  const city = person.locationCity ?? getCity(person.address.country, person.address.city)
  const country = getCountry(person.address.country)
  if (!city || !country) throw new RangeError('Generated location is unavailable')
  const username = person.email.split('@')[0].replace(/[^a-z0-9]/g, '')
  const password = `A1!${createHash('sha256').update(`persona-demo-login:${person.id}`).digest('base64url').slice(0, 14)}`
  return {
    id: person.id,
    gender: person.gender,
    name: { first: person.firstName, last: person.lastName, full: person.fullName },
    nationality: person.country,
    dob: { date: person.dateOfBirth, age: person.age, ageGroup: person.ageGroup },
    location: {
      street: person.address.line1,
      city: city.name,
      state: city.region,
      country: { code: country.code, name: country.name },
      postcode: person.address.postalCode,
      coordinates: { latitude: city.latitude, longitude: city.longitude, precision: 'city' },
      formatted: person.address.formatted,
    },
    email: person.email,
    phone: person.phone,
    picture: pictureRenditions(person.picture),
    login: { username, password },
  }
}

function copyPath(target: Record<string, unknown>, source: Record<string, unknown>, field: string): void {
  const parts = field.split('.')
  let output = target
  let input = source
  for (const [index, part] of parts.entries()) {
    const value = input[part]
    if (index === parts.length - 1 || value === null) {
      output[part] = value
      return
    }
    if (typeof value !== 'object' || Array.isArray(value)) throw new RangeError(`Invalid field ${field}`)
    output[part] ??= {}
    const next = output[part]
    if (!isRecord(next) || !isRecord(value)) throw new RangeError(`Invalid field ${field}`)
    output = next
    input = value
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function projectPeopleResponse(response: GeneratedPeopleResponse): DefaultPublicPeopleResponse
export function projectPeopleResponse(response: GeneratedPeopleResponse, fields: readonly FieldPath[] | undefined): ProjectedPublicPeopleResponse

export function projectPeopleResponse(
  response: GeneratedPeopleResponse,
  fields?: readonly FieldPath[],
): ProjectedPublicPeopleResponse {
  return {
    results: response.results.map((person) => {
      const source = publicPerson(person)
      if (fields === undefined) {
        const { login: _login, ...defaults } = source
        return defaults
      }
      const selected: ProjectedPublicPeopleResponse['results'][number] = {}
      for (const field of fields) copyPath(selected, source, field)
      return selected
    }),
    meta: { ...response.meta, schemaVersion: '2' },
  }
}
