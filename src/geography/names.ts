import { nameContextData } from './name-context-data.js'
import { namePoolData } from './name-pool-data.js'
import { andorraGivenNames } from './andorra-names.js'
import { bhutanGivenNames, myanmarGivenNames } from './surname-free-names.js'
import { malawiNames } from './malawi-names.js'
import { ethiopiaGivenNames } from './ethiopia-names.js'
import { africaReviewedNames, isAfricaReviewedCountry } from './africa-reviewed-names.js'

const myanmarContext = { pools: [{ locale: 'my_MM', tier: 'local', weight: 1 }], fallback: 'local' } as const
const andorraContext = { pools: [{ locale: 'ad_AD', tier: 'local', weight: 1 }], fallback: 'local' } as const
const bhutanContext = { pools: [{ locale: 'bt_BT', tier: 'local', weight: 1 }], fallback: 'local' } as const
const malawiContext = { pools: [{ locale: 'mw_MW', tier: 'local', weight: 1 }], fallback: 'local' } as const
const ethiopiaContext = { pools: [{ locale: 'et_ET', tier: 'local', weight: 1 }], fallback: 'local' } as const
const africaReviewedContexts = {
  AO: { pools: [{ locale: 'ao_AO', tier: 'local', weight: 1 }], fallback: 'local' },
  BF: { pools: [{ locale: 'bf_BF', tier: 'local', weight: 1 }], fallback: 'local' },
  BI: { pools: [{ locale: 'bi_BI', tier: 'local', weight: 1 }], fallback: 'local' },
  BJ: { pools: [{ locale: 'bj_BJ', tier: 'local', weight: 1 }], fallback: 'local' },
  BW: { pools: [{ locale: 'bw_BW', tier: 'local', weight: 1 }], fallback: 'local' },
  CD: { pools: [{ locale: 'cd_CD', tier: 'local', weight: 1 }], fallback: 'local' },
  CG: { pools: [{ locale: 'cg_CG', tier: 'local', weight: 1 }], fallback: 'local' },
  CI: { pools: [{ locale: 'ci_CI', tier: 'local', weight: 1 }], fallback: 'local' },
  CM: { pools: [{ locale: 'cm_CM', tier: 'local', weight: 1 }], fallback: 'local' },
  CV: { pools: [{ locale: 'cv_CV', tier: 'local', weight: 1 }], fallback: 'local' },
  DZ: { pools: [{ locale: 'dz_DZ', tier: 'local', weight: 1 }], fallback: 'local' },
  EG: { pools: [{ locale: 'eg_EG', tier: 'local', weight: 1 }], fallback: 'local' },
  GA: { pools: [{ locale: 'ga_GA', tier: 'local', weight: 1 }], fallback: 'local' },
  GH: { pools: [{ locale: 'gh_GH', tier: 'local', weight: 1 }], fallback: 'local' },
  GM: { pools: [{ locale: 'gm_GM', tier: 'local', weight: 1 }], fallback: 'local' },
  GN: { pools: [{ locale: 'gn_GN', tier: 'local', weight: 1 }], fallback: 'local' },
  GQ: { pools: [{ locale: 'gq_GQ', tier: 'local', weight: 1 }], fallback: 'local' },
  KE: { pools: [{ locale: 'ke_KE', tier: 'local', weight: 1 }], fallback: 'local' },
  LR: { pools: [{ locale: 'lr_LR', tier: 'local', weight: 1 }], fallback: 'local' },
  LS: { pools: [{ locale: 'ls_LS', tier: 'local', weight: 1 }], fallback: 'local' },
  MA: { pools: [{ locale: 'ma_MA', tier: 'local', weight: 1 }], fallback: 'local' },
  MG: { pools: [{ locale: 'mg_MG', tier: 'local', weight: 1 }], fallback: 'local' },
  ML: { pools: [{ locale: 'ml_ML', tier: 'local', weight: 1 }], fallback: 'local' },
  MZ: { pools: [{ locale: 'mz_MZ', tier: 'local', weight: 1 }], fallback: 'local' },
  NA: { pools: [{ locale: 'na_NA', tier: 'local', weight: 1 }], fallback: 'local' },
  NG: { pools: [{ locale: 'ng_NG', tier: 'local', weight: 1 }], fallback: 'local' },
  RE: { pools: [{ locale: 're_RE', tier: 'local', weight: 1 }], fallback: 'local' },
  RW: { pools: [{ locale: 'rw_RW', tier: 'local', weight: 1 }], fallback: 'local' },
  SC: { pools: [{ locale: 'sc_SC', tier: 'local', weight: 1 }], fallback: 'local' },
  SL: { pools: [{ locale: 'sl_SL', tier: 'local', weight: 1 }], fallback: 'local' },
  SN: { pools: [{ locale: 'sn_SN', tier: 'local', weight: 1 }], fallback: 'local' },
  TG: { pools: [{ locale: 'tg_TG', tier: 'local', weight: 1 }], fallback: 'local' },
  TN: { pools: [{ locale: 'tn_TN', tier: 'local', weight: 1 }], fallback: 'local' },
  TZ: { pools: [{ locale: 'tz_TZ', tier: 'local', weight: 1 }], fallback: 'local' },
  UG: { pools: [{ locale: 'ug_UG', tier: 'local', weight: 1 }], fallback: 'local' },
  ZA: { pools: [{ locale: 'za_ZA', tier: 'local', weight: 1 }], fallback: 'local' },
  ZM: { pools: [{ locale: 'zm_ZM', tier: 'local', weight: 1 }], fallback: 'local' },
  ZW: { pools: [{ locale: 'zw_ZW', tier: 'local', weight: 1 }], fallback: 'local' },
} as const

export function nameContextForCountry(country: string) {
  if (country === 'MM') return myanmarContext
  if (country === 'AD') return andorraContext
  if (country === 'BT') return bhutanContext
  if (country === 'MW') return malawiContext
  if (country === 'ET') return ethiopiaContext
  if (isAfricaReviewedCountry(country)) return africaReviewedContexts[country]
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
  if (selected.locale === 'et_ET') {
    const firstNames = ethiopiaGivenNames[gender]
    const firstName = firstNames[keyPart(key, 12) % firstNames.length]
    const maleNames = ethiopiaGivenNames.male
    let paternalIndex = keyPart(key, 24) % maleNames.length
    if (maleNames[paternalIndex] === firstName) paternalIndex = (paternalIndex + 1) % maleNames.length
    const lastName = maleNames[paternalIndex]
    return { firstName, lastName, fullName: `${firstName} ${lastName}`, locale: selected.locale, fallback: selected.tier }
  }
  if (isAfricaReviewedCountry(country)) {
    const names = africaReviewedNames[country]
    const firstName = names[gender][keyPart(key, 12) % names[gender].length]
    const lastName = names.family[keyPart(key, 24) % names.family.length]
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
