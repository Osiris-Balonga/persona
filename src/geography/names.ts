import { nameContextData } from './name-context-data.js'
import { namePoolData } from './name-pool-data.js'

export function nameContextForCountry(country: string) {
  return nameContextData[country]
}

function keyPart(key: string, offset: number): number {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid generation key')
  return Number.parseInt(key.slice(offset, offset + 12), 16)
}

export function selectName(country: string, gender: 'male' | 'female', key: string) {
  const context = nameContextForCountry(country)
  if (!context) throw new RangeError(`No name context for ${country}`)
  const total = context.pools.reduce((sum, pool) => sum + pool.weight, 0)
  if (total <= 0) throw new RangeError(`Invalid name weights for ${country}`)
  let position = keyPart(key, 0) % total
  const selected = context.pools.find((pool) => {
    position -= pool.weight
    return position < 0
  })!
  const names = namePoolData[selected.locale]
  if (!names) throw new RangeError(`Missing name pool ${selected.locale}`)
  const firstNames = names[gender]
  const lastNames = gender === 'female' ? names.lastFemale : names.lastMale
  const firstName = firstNames[keyPart(key, 12) % firstNames.length]
  const lastName = lastNames[keyPart(key, 24) % lastNames.length]
  return { firstName, lastName, locale: selected.locale, fallback: selected.tier }
}
