import type { PeopleQuery } from './people-query.js'
import { ageGroupForAge, ageOn, type AgeGroup } from './age.js'
import { resolveGeographicContext } from './geography/distribution.js'
import { nameContextForCountry, selectName } from './geography/names.js'
import { fictionalAddress } from './geography/address-data.js'
import { fictionalEmail, fictionalPhone } from './geography/fictional-contact.js'
import type { City } from './geography/cities.js'
import type { createGenerationContext } from './replay.js'

type GenerationContext = ReturnType<typeof createGenerationContext>

// The public v2 response is projected from this generation record. Keeping the
// source City here preserves the exact GeoNames coordinates and region.
export interface GeneratedPersonWithoutPortrait {
  id: string
  firstName: string
  lastName: string
  fullName: string
  gender: 'male' | 'female'
  age: number
  ageGroup: AgeGroup
  dateOfBirth: string
  appearance: string
  country: string
  city: string
  locationCity: City
  address: ReturnType<typeof fictionalAddress>
  email: string
  phone: string | null
}

const ageRanges: Record<AgeGroup, readonly [number, number]> = {
  child: [6, 12], teen: [13, 17], adult: [18, 64], senior: [65, 100],
}

function draw(key: string, range: number): number {
  if (!/^[0-9a-f]{64}$/.test(key) || !Number.isSafeInteger(range) || range < 1) {
    throw new RangeError('Invalid generation draw')
  }
  return Number.parseInt(key.slice(0, 12), 16) % range
}

function birthDateForAge(age: number, asOf: string, key: string): string {
  const day = new Date(Date.UTC(2000, 0, 1 + draw(key, 366)))
  const month = day.getUTCMonth() + 1
  const date = day.getUTCDate()
  const referenceYear = Number(asOf.slice(0, 4))
  const referenceMonthDay = asOf.slice(5)
  const selectedMonthDay = `${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
  const year = referenceYear - age - (selectedMonthDay > referenceMonthDay ? 1 : 0)
  if (year < 1) throw new RangeError('Age cannot be represented at asOf')
  // Date.UTC remaps years 0–99 to 1900–1999; setUTCFullYear preserves them.
  const candidate = new Date(0)
  candidate.setUTCFullYear(year, month, 0)
  const lastDayOfMonth = candidate.getUTCDate()
  candidate.setUTCFullYear(year, month - 1, Math.min(date, lastDayOfMonth))
  let value = candidate.toISOString().slice(0, 10)
  const actualAge = ageOn(value, asOf)
  if (actualAge !== age) {
    candidate.setUTCDate(candidate.getUTCDate() + (actualAge > age ? 1 : -1))
    value = candidate.toISOString().slice(0, 10)
  }
  if (ageOn(value, asOf) !== age) throw new RangeError('Unable to resolve birth date')
  return value
}

export function resolveAbstractPerson(query: PeopleQuery, context: GenerationContext, index: number) {
  const geography = resolveGeographicContext(query, context.componentKey(index, 'geography'))
  const gender = query.gender ?? (draw(context.componentKey(index, 'gender'), 2) === 0 ? 'female' : 'male')
  const allowedGroups = query.ageGroup ?? (['child', 'teen', 'adult', 'senior'] as const)
  const possibleAges = allowedGroups.flatMap((group) => {
    const [minimum, maximum] = ageRanges[group]
    return Array.from({ length: maximum - minimum + 1 }, (_, offset) => minimum + offset)
  })
  const age = possibleAges[draw(context.componentKey(index, 'age'), possibleAges.length)]
  const nameContext = nameContextForCountry(geography.nationality.code)
  if (!nameContext) throw new RangeError('Country has no name context')
  return { ...geography, nameContext, gender, age, ageGroup: ageGroupForAge(age) }
}

export function generatePersonWithoutPortrait(query: PeopleQuery, context: GenerationContext, index: number, nameAttempt = 0): GeneratedPersonWithoutPortrait {
  const resolved = resolveAbstractPerson(query, context, index)
  const country = resolved.nationality.code
  const residenceCountry = resolved.residenceCountry.code
  const city = resolved.city.name
  const name = selectName(country, resolved.gender, context.componentKey(index, nameAttempt === 0 ? 'identity' : `identity-${nameAttempt}`))
  return {
    id: `per_${context.componentKey(index, 'id').slice(0, 24)}`,
    firstName: name.firstName,
    lastName: name.lastName,
    fullName: name.fullName,
    gender: resolved.gender,
    age: resolved.age,
    ageGroup: resolved.ageGroup,
    dateOfBirth: birthDateForAge(resolved.age, query.asOf, context.componentKey(index, 'birth-date')),
    appearance: resolved.appearance,
    country,
    city,
    locationCity: resolved.city,
    address: fictionalAddress(resolved.city, context.componentKey(index, 'address')),
    email: fictionalEmail(name.firstName, name.lastName, context.componentKey(index, 'email'), query.emailDomain, index),
    phone: fictionalPhone(residenceCountry, city, context.componentKey(index, 'phone')),
  }
}
