import { resolveAgeConstraint, resolveAsOf, type AgeGroup } from './age.js'
import type { Person } from './contracts/person.js'
import { parseFieldSelection, type FieldPath } from './field-selection.js'
import { getCountry } from './geography/countries.js'
import { canGenerateProfile } from './geography/profile-availability.js'
import { getCity } from './geography/cities.js'
import { isAppearance } from './geography/appearance.js'

export interface PeopleQuery {
  count: number
  asOf: string
  gender?: Person['gender']
  age?: number
  ageGroup?: AgeGroup
  appearance?: string
  country?: string
  city?: string
  seed?: string
  fields?: readonly FieldPath[]
}

export class PeopleQueryError extends Error {
  readonly statusCode = 400

  constructor(
    readonly code: 'INVALID_QUERY' | 'CONFLICTING_FILTERS' | 'UNSUPPORTED_VALUE',
    readonly parameter: string,
    message: string,
  ) {
    super(message)
    this.name = 'PeopleQueryError'
  }
}

const allowedParameters = new Set([
  'count', 'gender', 'age', 'ageGroup', 'appearance', 'country',
  'city', 'seed', 'asOf', 'fields',
])

function integerParameter(value: string | null, name: string, minimum: number, maximum: number) {
  if (value === null) return undefined
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new PeopleQueryError('INVALID_QUERY', name, `${name} must be an integer`)
  }
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new PeopleQueryError('INVALID_QUERY', name, `${name} must be between ${minimum} and ${maximum}`)
  }
  return number
}

function boundedString(value: string | null, name: string, maximum: number) {
  if (value === null) return undefined
  if (value.trim().length === 0 || value.length > maximum) {
    throw new PeopleQueryError('INVALID_QUERY', name, `${name} must contain 1 to ${maximum} characters`)
  }
  return value
}

export function parsePeopleQuery(params: URLSearchParams, now: Date = new Date()): PeopleQuery {
  if (params.toString().length > 2_048) {
    throw new PeopleQueryError('INVALID_QUERY', 'query', 'Query string is too long')
  }
  const seen = new Set<string>()
  for (const name of params.keys()) {
    if (!allowedParameters.has(name) || seen.has(name)) {
      throw new PeopleQueryError('INVALID_QUERY', name, `Unknown or repeated parameter: ${name}`)
    }
    seen.add(name)
  }

  const count = integerParameter(params.get('count'), 'count', 1, 100) ?? 1
  const age = integerParameter(params.get('age'), 'age', 6, 100)
  const gender = params.get('gender')
  if (gender !== null && gender !== 'male' && gender !== 'female') {
    throw new PeopleQueryError('INVALID_QUERY', 'gender', 'gender must be male or female')
  }
  const ageGroup = params.get('ageGroup')
  if (ageGroup !== null && !['child', 'teen', 'adult', 'senior'].includes(ageGroup)) {
    throw new PeopleQueryError('INVALID_QUERY', 'ageGroup', 'Unknown ageGroup')
  }

  let resolvedAge: ReturnType<typeof resolveAgeConstraint>
  try {
    resolvedAge = resolveAgeConstraint({
      age,
      ageGroup: ageGroup === null ? undefined : ageGroup as AgeGroup,
    })
  } catch {
    throw new PeopleQueryError('CONFLICTING_FILTERS', 'ageGroup', 'age and ageGroup disagree')
  }

  const appearance = boundedString(params.get('appearance'), 'appearance', 64)
  if (appearance !== undefined && !/^[a-z]+(?:-[a-z]+)*$/.test(appearance)) {
    throw new PeopleQueryError('INVALID_QUERY', 'appearance', 'appearance must be a lowercase slug')
  }
  if (appearance !== undefined && !isAppearance(appearance)) {
    throw new PeopleQueryError('UNSUPPORTED_VALUE', 'appearance', 'Unknown appearance category')
  }
  const country = params.get('country')
  if (country !== null && !/^[A-Z]{2}$/.test(country)) {
    throw new PeopleQueryError('INVALID_QUERY', 'country', 'country must be a two-letter uppercase code')
  }
  if (country !== null) {
    const entry = getCountry(country)
    if (entry === undefined || !canGenerateProfile(entry)) {
      throw new PeopleQueryError('UNSUPPORTED_VALUE', 'country', 'country is not available for beta profiles')
    }
  }
  const city = boundedString(params.get('city'), 'city', 100)?.trim()
  if (city !== undefined && country === null) {
    throw new PeopleQueryError('CONFLICTING_FILTERS', 'city', 'city requires country')
  }
  if (city !== undefined && country !== null && getCity(country, city) === undefined) {
    throw new PeopleQueryError('UNSUPPORTED_VALUE', 'city', 'city is not available for the selected country')
  }
  const seed = boundedString(params.get('seed'), 'seed', 128)
  const fieldsValue = boundedString(params.get('fields'), 'fields', 512)
  let fields: readonly FieldPath[] | undefined
  if (fieldsValue !== undefined) {
    try {
      fields = parseFieldSelection(fieldsValue)
    } catch (error) {
      throw new PeopleQueryError('INVALID_QUERY', 'fields', (error as Error).message)
    }
  }

  let asOf: string
  try {
    asOf = resolveAsOf(params.get('asOf') ?? undefined, now)
  } catch {
    throw new PeopleQueryError('INVALID_QUERY', 'asOf', 'asOf must be a valid YYYY-MM-DD date')
  }

  return {
    count,
    asOf,
    ...(gender === null ? {} : { gender }),
    ...resolvedAge,
    ...(appearance === undefined ? {} : { appearance }),
    ...(country === null ? {} : { country }),
    ...(city === undefined ? {} : { city }),
    ...(seed === undefined ? {} : { seed }),
    ...(fields === undefined ? {} : { fields }),
  }
}
