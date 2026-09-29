import { createHash } from 'node:crypto'
import type { Person } from './contracts/person.js'
import type { PeopleResponse } from './contracts/people.js'
import { PublicPersonSchema, type PublicPerson } from './contracts/public-person.js'
import type { PublicPeopleResponse } from './contracts/public-people.js'
import { getCity, type City } from './geography/cities.js'
import { getCountry } from './geography/countries.js'

export type FieldPath = string

const publicFields = Object.keys(PublicPersonSchema.properties)
export const defaultPersonFields: readonly FieldPath[] = publicFields.filter((field) => field !== 'login')
const nestedFields: Readonly<Record<string, readonly string[]>> = {
  name: ['first', 'last', 'full'],
  dob: ['date', 'age', 'ageGroup'],
  location: ['street', 'city', 'state', 'country', 'postcode', 'coordinates', 'formatted'],
  'location.country': ['code', 'name'],
  'location.coordinates': ['latitude', 'longitude', 'precision'],
  picture: ['large', 'medium', 'thumbnail'],
  login: ['username', 'password'],
}

export function parseFieldSelection(value: string): readonly FieldPath[] {
  const fields = value.split(',').map((field) => field.trim())
  const seen = new Set<string>()
  for (const field of fields) {
    const parts = field.split('.')
    const parent = parts.slice(0, -1).join('.')
    const valid = parts.length === 1 ? publicFields.includes(field)
      : nestedFields[parent]?.includes(parts.at(-1) ?? '') === true
    if (!valid) throw new Error(`Unknown public field: ${field || '(empty)'}`)
    if (seen.has(field)) throw new Error(`Repeated field: ${field}`)
    if (fields.some((other) => other !== field &&
      (other.startsWith(`${field}.`) || field.startsWith(`${other}.`)))) {
      throw new Error(`Conflicting fields: ${field} and a nested field`)
    }
    seen.add(field)
  }
  return fields
}

type GeneratedPerson = Person & { locationCity?: City }

function pictureRenditions(picture: Person['picture']): PublicPerson['picture'] {
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
    output = output[part] as Record<string, unknown>
    input = value as Record<string, unknown>
  }
}

export function projectPeopleResponse(
  response: PeopleResponse,
  fields: readonly FieldPath[] = defaultPersonFields,
): PublicPeopleResponse {
  return {
    results: response.results.map((person) => {
      const source = publicPerson(person as GeneratedPerson) as Record<string, unknown>
      const selected: Record<string, unknown> = {}
      for (const field of fields) copyPath(selected, source, field)
      return selected
    }),
    meta: { ...response.meta, schemaVersion: '2' },
  } as PublicPeopleResponse
}
