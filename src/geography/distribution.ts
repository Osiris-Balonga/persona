import type { PeopleQuery } from '../people-query.js'
import { appearanceCategories, isAppearance } from './appearance.js'
import { getCity, listCities } from './cities.js'
import { getCountry, listCountries } from './countries.js'

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
  query: Pick<PeopleQuery, 'country' | 'city' | 'appearance'>,
  key: string,
) {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid generation key')
  const draw = (offset: number) => Number.parseInt(key.slice(offset, offset + 12), 16)
  const country = query.country === undefined
    ? chooseWeighted(listCountries().filter((entry) => entry.generation === 'eligible')
      .map((value) => ({ value, weight: 1 })), draw(0))
    : getCountry(query.country)
  if (!country || country.generation !== 'eligible') throw new RangeError('Unavailable resident country')

  const city = query.city === undefined
    ? chooseWeighted(listCities(country.code).map((value) => ({
      value, weight: Math.max(1, Math.round(Math.sqrt(value.population))),
    })), draw(12))
    : getCity(country.code, query.city)
  if (!city) throw new RangeError('City is not in the selected country')

  if (query.appearance !== undefined && !isAppearance(query.appearance)) {
    throw new RangeError('Unknown appearance category')
  }
  const appearance = query.appearance ?? chooseWeighted(appearanceCategories.map((value) => ({
    value, weight: 1,
  })), draw(24))

  return { country, city, appearance }
}
