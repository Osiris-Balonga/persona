import { nameContextData } from './name-context-data.js'
import { namePoolData } from './name-pool-data.js'
import { myanmarGivenNames } from './surname-free-names.js'

const myanmarContext = { pools: [{ locale: 'my_MM', tier: 'local', weight: 1 }], fallback: 'local' } as const

export function nameContextForCountry(country: string) {
  if (country === 'MM') return myanmarContext
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
  if (selected.locale === 'my_MM') {
    const firstNames = myanmarGivenNames[gender]
    const firstName = firstNames[keyPart(key, 12) % firstNames.length]
    return { firstName, lastName: null, fullName: firstName, locale: selected.locale, fallback: selected.tier }
  }
  const names = namePoolData[selected.locale]
  if (!names) throw new RangeError(`Missing name pool ${selected.locale}`)
  const firstNames = names[gender]
  const lastNames = gender === 'female' ? names.lastFemale : names.lastMale
  const firstName = firstNames[keyPart(key, 12) % firstNames.length]
  const lastName = lastNames[keyPart(key, 24) % lastNames.length]
  if (country === 'ID') {
    const givenName = `${firstName} ${lastName}`
    return { firstName: givenName, lastName: null, fullName: givenName, locale: selected.locale, fallback: selected.tier }
  }
  return { firstName, lastName, fullName: `${firstName} ${lastName}`, locale: selected.locale, fallback: selected.tier }
}
