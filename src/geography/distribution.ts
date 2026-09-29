import type { PeopleQuery } from '../people-query.js'
import { isAppearance } from './appearance.js'
import { appearanceDistributionForCountry } from './appearance-distribution.js'
import { getCity, listCities } from './cities.js'
import { getCountry, listCountries } from './countries.js'
import { continentForCountry } from './continents.js'
import { canGenerateProfile } from './profile-availability.js'

export function chooseWeighted<T>(items: readonly { value: T; weight: number }[], draw: number): T {
  if (!Number.isSafeInteger(draw) || draw < 0 || items.length === 0
    || items.some((item) => !Number.isSafeInteger(item.weight) || item.weight < 1)) {
    throw new RangeError('Invalid weighted choice')
  }
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  if (!Number.isSafeInteger(total)) throw new RangeError('Invalid total weight')
  let position = draw % total
  for (const item of items) {
    position -= item.weight
    if (position < 0) return item.value
  }
  throw new RangeError('Unreachable weighted choice')
}

export function resolveGeographicContext(
  query: Pick<PeopleQuery, 'nationality' | 'residenceCountry' | 'continent' | 'city'>
    & { country?: string; appearance?: string },
  key: string,
) {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid generation key')
  const draw = (offset: number) => Number.parseInt(key.slice(offset, offset + 12), 16)
  const nationalityCode = query.nationality ?? query.country
    ?? (query.continent === undefined ? query.residenceCountry : undefined)
  const nationality = nationalityCode === undefined
    ? chooseWeighted(listCountries().filter((country) => canGenerateProfile(country)
      && (query.continent === undefined || continentForCountry(country.code) === query.continent))
      .map((value) => ({ value, weight: 1 })), draw(0))
    : getCountry(nationalityCode)
  if (!nationality || !canGenerateProfile(nationality)
    || (query.continent !== undefined && continentForCountry(nationality.code) !== query.continent)) {
    throw new RangeError('Unavailable beta profile nationality')
  }

  const residenceCountry = getCountry(query.residenceCountry ?? nationality.code)
  if (!residenceCountry || residenceCountry.generation !== 'eligible'
    || listCities(residenceCountry.code).length === 0) {
    throw new RangeError('Unavailable beta profile residence country')
  }

  const city = query.city === undefined
    ? chooseWeighted(listCities(residenceCountry.code).map((value) => ({
      value, weight: Math.max(1, Math.round(Math.sqrt(value.population))),
    })), draw(12))
    : getCity(residenceCountry.code, query.city)
  if (!city) throw new RangeError('City is not in the selected country')

  if (query.appearance !== undefined && !isAppearance(query.appearance)) {
    throw new RangeError('Unknown appearance category')
  }
  const appearance = query.appearance ?? chooseWeighted(appearanceDistributionForCountry(nationality.code).weights, draw(24))

  return { nationality, residenceCountry, country: nationality, city, appearance }
}
