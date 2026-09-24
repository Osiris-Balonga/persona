import { nameContextData } from './name-context-data.js'
import { namePoolData } from './name-pool-data.js'
import { andorraGivenNames } from './andorra-names.js'
import { bhutanGivenNames, myanmarGivenNames } from './surname-free-names.js'
import { malawiNames } from './malawi-names.js'

const myanmarContext = { pools: [{ locale: 'my_MM', tier: 'local', weight: 1 }], fallback: 'local' } as const
const andorraContext = { pools: [{ locale: 'ad_AD', tier: 'local', weight: 1 }], fallback: 'local' } as const
const bhutanContext = { pools: [{ locale: 'bt_BT', tier: 'local', weight: 1 }], fallback: 'local' } as const
const malawiContext = { pools: [{ locale: 'mw_MW', tier: 'local', weight: 1 }], fallback: 'local' } as const

export function nameContextForCountry(country: string) {
  if (country === 'MM') return myanmarContext
  if (country === 'AD') return andorraContext
  if (country === 'BT') return bhutanContext
  if (country === 'MW') return malawiContext
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
    const fullName = firstNames[keyPart(key, 12) % firstNames.length]
    const boundary = fullName.lastIndexOf(' ')
    const firstName = fullName.slice(0, boundary)
    const lastName = fullName.slice(boundary + 1)
    return { firstName, lastName, fullName, locale: selected.locale, fallback: selected.tier }
  }
  if (selected.locale === 'bt_BT') {
    const first = bhutanGivenNames.first[keyPart(key, 12) % bhutanGivenNames.first.length]
    const secondNames = gender === 'female' ? bhutanGivenNames.femaleSecond : bhutanGivenNames.maleSecond
    const lastName = secondNames[keyPart(key, 24) % secondNames.length]
    return { firstName: first, lastName, fullName: `${first} ${lastName}`, locale: selected.locale, fallback: selected.tier }
  }
  if (selected.locale === 'mw_MW') {
    const firstName = malawiNames.given[keyPart(key, 12) % malawiNames.given.length]
    const lastName = malawiNames.family[keyPart(key, 24) % malawiNames.family.length]
    return { firstName, lastName, fullName: `${firstName} ${lastName}`, locale: selected.locale, fallback: selected.tier }
  }
  if (selected.locale === 'ad_AD') {
    const firstNames = andorraGivenNames[gender]
    const lastNames = gender === 'female' ? namePoolData.es.lastFemale : namePoolData.es.lastMale
    const firstName = firstNames[keyPart(key, 12) % firstNames.length]
    const lastName = lastNames[keyPart(key, 24) % lastNames.length]
    return { firstName, lastName, fullName: `${firstName} ${lastName}`, locale: selected.locale, fallback: selected.tier }
  }
  const names = namePoolData[selected.locale]
  if (!names) throw new RangeError(`Missing name pool ${selected.locale}`)
  const firstNames = names[gender]
  const lastNames = gender === 'female' ? names.lastFemale : names.lastMale
  const firstName = firstNames[keyPart(key, 12) % firstNames.length]
  const lastName = lastNames[keyPart(key, 24) % lastNames.length]
  return { firstName, lastName, fullName: `${firstName} ${lastName}`, locale: selected.locale, fallback: selected.tier }
}
