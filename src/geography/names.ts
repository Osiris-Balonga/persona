import { resolveNameProvider } from './name-providers.js'

export function nameContextForCountry(country: string) {
  return resolveNameProvider(country)?.context
}

function keyPart(key: string, offset: number): number {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid generation key')
  return Number.parseInt(key.slice(offset, offset + 12), 16)
}

export function selectName(country: string, gender: 'male' | 'female', key: string) {
  const provider = resolveNameProvider(country)
  if (!provider) throw new RangeError(`No name context for ${country}`)
  const total = provider.context.pools.reduce((sum, pool) => sum + pool.weight, 0)
  if (total <= 0) throw new RangeError(`Invalid name weights for ${country}`)
  let position = keyPart(key, 0) % total
  const selected = provider.context.pools.find((pool) => {
    position -= pool.weight
    return position < 0
  })!
  const components = provider.pools[selected.locale]
  if (!components) throw new RangeError(`Missing name pool ${selected.locale}`)
  const firstNames = components.given[gender]
  const firstName = firstNames[keyPart(key, 12) % firstNames.length]
  if (components.strategy === 'full-name') {
    const boundary = firstName.lastIndexOf(' ')
    return { firstName: firstName.slice(0, boundary), lastName: firstName.slice(boundary + 1), fullName: firstName, locale: selected.locale, fallback: selected.tier }
  }
  const secondNames = components.second[gender]
  let secondIndex = keyPart(key, 24) % secondNames.length
  if (components.strategy === 'patronymic' && secondNames[secondIndex] === firstName) secondIndex = (secondIndex + 1) % secondNames.length
  const lastName = secondNames[secondIndex]
  return { firstName, lastName, fullName: `${firstName} ${lastName}`, locale: selected.locale, fallback: selected.tier }
}
