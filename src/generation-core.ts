import type { Person } from './contracts/person.js'
import type { PeopleQuery } from './people-query.js'
import { ageGroupForAge, ageOn } from './age.js'
import { resolveGeographicContext } from './geography/distribution.js'
import { nameContextForCountry, selectName } from './geography/names.js'
import { fictionalAddress } from './geography/address-data.js'
import { fictionalEmail, fictionalPhone } from './geography/fictional-contact.js'
import type { createGenerationContext } from './replay.js'

type GenerationContext = ReturnType<typeof createGenerationContext>
type AgeGroup = Person['ageGroup']

const ageRanges: Record<AgeGroup, readonly [number, number]> = {
  child: [6, 12], teen: [13, 17], adult: [18, 64], senior: [65, 120],
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
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const candidate = new Date(Date.UTC(year, month - 1, Math.min(date, lastDayOfMonth)))
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
  const [minimum, maximum] = query.ageGroup === undefined ? [6, 120] : ageRanges[query.ageGroup]
  const age = query.age ?? minimum + draw(context.componentKey(index, 'age'), maximum - minimum + 1)
  const nameContext = nameContextForCountry(geography.country.code)
  if (!nameContext) throw new RangeError('Country has no name context')
  return { ...geography, nameContext, gender, age, ageGroup: ageGroupForAge(age) }
}

export function generatePersonWithoutPortrait(query: PeopleQuery, context: GenerationContext, index: number, nameAttempt = 0): Omit<Person, 'picture'> {
  const resolved = resolveAbstractPerson(query, context, index)
  const country = resolved.country.code
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
    address: fictionalAddress(resolved.city, context.componentKey(index, 'address')),
    email: fictionalEmail(name.firstName, name.lastName, context.componentKey(index, 'email')),
    phone: fictionalPhone(country, city, context.componentKey(index, 'phone')),
  }
}
