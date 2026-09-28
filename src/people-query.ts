import { resolveAsOf, type AgeGroup } from './age.js'
import type { Person } from './contracts/person.js'
import { parseFieldSelection, type FieldPath } from './field-selection.js'
import { getCountry } from './geography/countries.js'
import { listCities, getCity } from './geography/cities.js'
import { hasReviewedNamePool } from './geography/profile-availability.js'
import { continentForCountry, type Continent } from './geography/continents.js'

export interface PeopleQuery {
  count: number
  asOf: string
  gender?: Person['gender']
  ageGroup?: readonly AgeGroup[]
  nationality?: string
  residenceCountry?: string
  continent?: Continent
  city?: string
  seed?: string
  fields?: readonly FieldPath[]
  emailDomain?: string
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
  'count', 'gender', 'ageGroup', 'nationality', 'residenceCountry',
  'continent', 'city', 'seed', 'asOf', 'fields', 'emailDomain',
])

const ageGroups: readonly AgeGroup[] = ['child', 'teen', 'adult', 'senior']

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

function countryCode(value: string | null, parameter: string, needsNames: boolean) {
  if (value === null) return undefined
  if (!/^[A-Z]{2}$/.test(value)) {
    throw new PeopleQueryError('INVALID_QUERY', parameter, `${parameter} must be a two-letter uppercase code`)
  }
  const country = getCountry(value)
  if (!country || country.generation !== 'eligible' || listCities(value).length === 0
    || (needsNames && !hasReviewedNamePool(value))) {
    throw new PeopleQueryError('UNSUPPORTED_VALUE', parameter, `${parameter} is not available for beta profiles`)
  }
  return value
}

function parseAgeGroups(value: string | null): readonly AgeGroup[] | undefined {
  if (value === null) return undefined
  const supplied = value.split(',').map((group) => group.trim())
  if (supplied.some((group) => !ageGroups.includes(group as AgeGroup))
    || new Set(supplied).size !== supplied.length) {
    throw new PeopleQueryError('INVALID_QUERY', 'ageGroup', 'ageGroup must contain distinct known groups')
  }
  return ageGroups.filter((group) => supplied.includes(group))
}

function parseEmailDomain(value: string | null): string {
  if (value === null) return 'example.test'
  const domain = value.toLowerCase()
  if (domain.length > 253 || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)
    || domain.split('.').some((part) => part.length > 63 || part.startsWith('-') || part.endsWith('-'))
    || !/^[a-z]{2,63}$/.test(domain.slice(domain.lastIndexOf('.') + 1))) {
    throw new PeopleQueryError('INVALID_QUERY', 'emailDomain', 'emailDomain must be a valid domain name')
  }
  return domain
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
  const gender = params.get('gender')
  if (gender !== null && gender !== 'male' && gender !== 'female') {
    throw new PeopleQueryError('INVALID_QUERY', 'gender', 'gender must be male or female')
  }
  const ageGroup = parseAgeGroups(params.get('ageGroup'))
  let nationality = countryCode(params.get('nationality'), 'nationality', true)
  let residenceCountry = countryCode(params.get('residenceCountry'), 'residenceCountry', false)
  const continentValue = params.get('continent')
  if (continentValue !== null && !['africa', 'americas', 'asia', 'europe', 'oceania'].includes(continentValue)) {
    throw new PeopleQueryError('INVALID_QUERY', 'continent', 'Unknown continent')
  }
  const continent = continentValue === null ? undefined : continentValue as Continent
  if (continent && nationality && continentForCountry(nationality) !== continent) {
    throw new PeopleQueryError('CONFLICTING_FILTERS', 'continent', 'continent and nationality disagree')
  }
  if (nationality === undefined && residenceCountry !== undefined && continent === undefined) {
    nationality = countryCode(residenceCountry, 'nationality', true)
  }
  if (residenceCountry === undefined && nationality !== undefined) residenceCountry = nationality

  const cityInput = boundedString(params.get('city'), 'city', 100)?.trim()
  if (cityInput !== undefined && residenceCountry === undefined) {
    throw new PeopleQueryError('CONFLICTING_FILTERS', 'city', 'city requires residenceCountry or nationality')
  }
  const city = cityInput === undefined ? undefined : getCity(residenceCountry!, cityInput)?.name
  if (cityInput !== undefined && city === undefined) {
    throw new PeopleQueryError('UNSUPPORTED_VALUE', 'city', 'city is not available for the selected residence country')
  }
  const seed = boundedString(params.get('seed'), 'seed', 128)
  const emailDomain = parseEmailDomain(params.get('emailDomain'))
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
    emailDomain,
    ...(gender === null ? {} : { gender }),
    ...(ageGroup === undefined ? {} : { ageGroup }),
    ...(nationality === undefined ? {} : { nationality }),
    ...(residenceCountry === undefined ? {} : { residenceCountry }),
    ...(continent === undefined ? {} : { continent }),
    ...(city === undefined ? {} : { city }),
    ...(seed === undefined ? {} : { seed }),
    ...(fields === undefined ? {} : { fields }),
  }
}
