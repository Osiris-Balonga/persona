import { AddressSchema, PersonSchema, PictureSchema, type Person } from './contracts/person.js'
import type { PeopleResponse, ProjectedPeopleResponse } from './contracts/people.js'

export type FieldPath = keyof Person | `address.${keyof Person['address']}` | 'picture.url'

const publicFields = new Set(Object.keys(PersonSchema.properties))
export const defaultPersonFields = Object.keys(PersonSchema.properties)
  .filter((field) => field !== 'ageGroup' && field !== 'appearance') as FieldPath[]
const nestedFields = new Map<string, Set<string>>([
  ['address', new Set(Object.keys(AddressSchema.properties))],
  ['picture', new Set(Object.keys(PictureSchema.properties))],
])

export function parseFieldSelection(value: string): readonly FieldPath[] {
  const fields = value.split(',').map((field) => field.trim())
  const seen = new Set<string>()

  for (const field of fields) {
    const parts = field.split('.')
    const valid = parts.length === 1
      ? publicFields.has(field)
      : parts.length === 2 && nestedFields.get(parts[0] ?? '')?.has(parts[1] ?? '') === true
    if (!valid) throw new Error(`Unknown public field: ${field || '(empty)'}`)
    if (seen.has(field)) throw new Error(`Repeated field: ${field}`)
    if (parts.length === 2 && seen.has(parts[0] ?? '')) {
      throw new Error(`Conflicting fields: ${parts[0]} and ${field}`)
    }
    if (parts.length === 1 && fields.some((other) => other.startsWith(`${field}.`))) {
      throw new Error(`Conflicting fields: ${field} and a nested field`)
    }
    seen.add(field)
  }

  return fields as FieldPath[]
}

function projectPerson(person: Person, fields: readonly FieldPath[]): ProjectedPeopleResponse['results'][number] {
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    if (field === 'address') {
      const { line1, city, region, postalCode, country, formatted } = person.address
      result.address = { line1, city, region, postalCode, country, formatted }
    } else if (field.startsWith('address.')) {
      const key = field.slice('address.'.length) as keyof Person['address']
      const address = (result.address ?? {}) as Record<string, unknown>
      address[key] = person.address[key]
      result.address = address
    } else if (field === 'picture' || field === 'picture.url') {
      result.picture = person.picture === null ? null : { url: person.picture.url }
    } else {
      result[field] = person[field as keyof Person]
    }
  }

  return result
}

export function projectPeopleResponse(
  response: PeopleResponse,
  fields: readonly FieldPath[] = defaultPersonFields,
): ProjectedPeopleResponse {
  const { count, asOf, seed, dataVersion, catalogVersion } = response.meta
  return {
    results: response.results.map((person) => projectPerson(person, fields)),
    meta: { count, asOf, seed, dataVersion, catalogVersion },
  }
}
