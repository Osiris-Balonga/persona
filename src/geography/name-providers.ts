import { nameContextData } from './name-context-data.js'
import { namePoolData } from './name-pool-data.js'
import { bhutanGivenNames, myanmarGivenNames } from './surname-free-names.js'
import { malawiNames } from './malawi-names.js'
import { ethiopiaGivenNames } from './ethiopia-names.js'
import { africaReviewedNames } from './africa-reviewed-names.js'
import { europeReviewedNames } from './europe-reviewed-names.js'
import { europeGenderedNames } from './europe-gendered-names.js'
import { europeIslandNames } from './europe-island-names.js'
import { asiaReviewedNames } from './asia-reviewed-names.js'
import { asiaWestNames } from './asia-west-names.js'
import { asiaEastNames } from './asia-east-names.js'
import { asiaCentralNames } from './asia-central-names.js'
import { asiaAdditionalNames } from './asia-additional-names.js'
import { northAmericaReviewedNames } from './north-america-reviewed-names.js'
import { northAmericaTerritoryNames } from './north-america-territory-names.js'
import { oceaniaReviewedNames } from './oceania-reviewed-names.js'
import { oceaniaTerritoryNames } from './oceania-territory-names.js'
import { southAmericaReviewedNames } from './south-america-reviewed-names.js'
import { southAmericaTerritoryNames } from './south-america-territory-names.js'

import type { NameContext } from './name-context-data.js'
import type { GeographicSource } from './sources.js'

type Gender = 'female' | 'male'
export type NameComponents =
  | { strategy: 'full-name'; given: Record<Gender, readonly string[]> }
  | { strategy: 'paired' | 'patronymic'; given: Record<Gender, readonly string[]>; second: Record<Gender, readonly string[]> }

export type NameProvider = {
  context: NameContext
  reviewed: boolean
  source: GeographicSource
  supplementarySources: readonly GeographicSource[]
  pools: Readonly<Record<string, NameComponents>>
}

const nameSourceByCountry: Record<string, GeographicSource> = {
  AO: 'wikidata-africa-name-batch', BF: 'wikidata-africa-name-batch',
  BI: 'wikidata-africa-qlever-candidates', BJ: 'wikidata-africa-name-batch', BT: 'bhutan-naming-study', BW: 'botswana-parliament-names',
  CD: 'wikidata-africa-name-batch', CF: 'wikidata-africa-qlever-candidates', CG: 'congo-senate-names',
  CI: 'wikidata-africa-qlever-candidates', CM: 'wikidata-africa-qlever-candidates',
  CV: 'wikidata-africa-qlever-candidates', DJ: 'wikidata-africa-qlever-candidates',
  DZ: 'wikidata-africa-qlever-candidates', EG: 'wikidata-africa-qlever-candidates', EH: 'sahrawi-womens-union-names', ER: 'wikidata-africa-qlever-candidates',
  ET: 'tesfa-ethiopian-names', GA: 'wikidata-africa-qlever-candidates', GH: 'wikidata-names', GM: 'wikidata-africa-qlever-candidates',
  GN: 'wikidata-africa-qlever-candidates', GQ: 'wikidata-africa-qlever-candidates', GW: 'wikidata-africa-qlever-candidates', KE: 'wikidata-africa-qlever-candidates', KM: 'wikidata-africa-qlever-candidates',
  LR: 'wikidata-africa-qlever-candidates', LS: 'lesotho-parliament-names',
  LY: 'wikidata-africa-qlever-candidates',
  MA: 'wikidata-africa-qlever-candidates', MG: 'wikidata-africa-qlever-candidates', ML: 'wikidata-africa-qlever-candidates', MM: 'burmese-name-frequencies', MR: 'wikidata-africa-qlever-candidates',
  MU: 'wikidata-africa-qlever-candidates', MW: 'peace-corps-chichewa-names',
  MZ: 'wikidata-africa-qlever-candidates',
  NA: 'namibia-parliament-names', NE: 'wikidata-africa-qlever-candidates', NG: 'wikidata-africa-qlever-candidates',
  RE: 'insee-reunion-given-names',
  RW: 'wikidata-names', SC: 'seychelles-parliament-names', SH: 'st-helena-election-names', SL: 'wikidata-africa-qlever-candidates',
  SD: 'wikidata-africa-qlever-candidates', SN: 'wikidata-names',
  SO: 'wikidata-africa-qlever-candidates', SS: 'wikidata-africa-qlever-candidates', ST: 'wikidata-africa-qlever-candidates', SZ: 'wikidata-africa-qlever-candidates', TD: 'wikidata-africa-qlever-candidates',
  TG: 'wikidata-africa-qlever-candidates', TN: 'wikidata-africa-qlever-candidates', TZ: 'wikidata-africa-qlever-candidates',
  UG: 'wikidata-africa-qlever-candidates', ZA: 'stats-sa-birth-names', ZM: 'wikidata-africa-qlever-candidates',
  YT: 'insee-mayotte-given-names', ZW: 'wikidata-africa-qlever-candidates',
}
const nameSupplementaryByCountry: Record<string, readonly GeographicSource[]> = {
  AD: ['andorra-civil-names'], ET: ['uk-ethiopia-names'], GE: ['geonames-country-info', 'georgia-name-statistics'],
  GH: ['faker', 'ghana-parliament-names'], ID: ['geonames-country-info', 'uk-indonesia-names'],
  DJ: ['wikidata-africa-birthplace-candidates'], ER: ['wikidata-africa-birthplace-candidates'], GW: ['wikidata-africa-birthplace-candidates'],
  KE: ['kenya-parliament-names'], KM: ['wikidata-africa-birthplace-candidates'], LY: ['wikidata-africa-birthplace-candidates'], MM: ['uk-myanmar-names'], MR: ['wikidata-africa-birthplace-candidates'], MW: ['ifla-malawi-names'],
  NE: ['wikidata-africa-birthplace-candidates'], SH: ['st-helena-election-names-2021'], ST: ['wikidata-africa-birthplace-candidates'], SZ: ['wikidata-africa-birthplace-candidates'], TD: ['wikidata-africa-birthplace-candidates'],
  RE: ['insee-reunion-family-names'], RW: ['rwanda-vital-names', 'rwanda-parliament-names'], SN: ['faker', 'senegal-presidency-names'],
  TZ: ['tanzania-parliament-names'], UG: ['uganda-parliament-names'],
  YT: ['wikidata-africa-birthplace-candidates', 'mayotte-election-names'],
  ZM: ['zambia-parliament-names'], ZW: ['zimbabwe-parliament-names'],
}


const providers = new Map<string, NameProvider>()
const supplementary = (country: string): readonly GeographicSource[] => nameSupplementaryByCountry[country] ?? ['geonames-country-info']

function paired(given: Record<Gender, readonly string[]>, second: Record<Gender, readonly string[]>): NameComponents {
  return { strategy: 'paired', given, second }
}

for (const [country, context] of Object.entries(nameContextData)) {
  const pools: Record<string, NameComponents> = {}
  for (const pool of context.pools) {
    const names = namePoolData[pool.locale]
    if (names) pools[pool.locale] = paired(names, { female: names.lastFemale, male: names.lastMale })
  }
  providers.set(country, { context, pools, reviewed: false, source: nameSourceByCountry[country] ?? 'faker', supplementarySources: supplementary(country) })
}

type FamilyNames = Record<Gender, readonly string[]> & (
  | { family: readonly string[] }
  | { familyFemale: readonly string[]; familyMale: readonly string[] }
)

function localProvider(country: string, components: NameComponents, source: GeographicSource, supplementarySources = supplementary(country), locale = country.toLowerCase() + '_' + country): void {
  providers.set(country, {
    context: { pools: [{ locale, tier: 'local', weight: 1 }], fallback: 'local' },
    pools: { [locale]: components }, reviewed: true, source, supplementarySources,
  })
}

function registerFamilyNames(table: Readonly<Record<string, FamilyNames>>, source: GeographicSource, supplementarySources?: readonly GeographicSource[]): void {
  for (const [country, names] of Object.entries(table)) {
    const second = 'family' in names ? { female: names.family, male: names.family }
      : { female: names.familyFemale, male: names.familyMale }
    localProvider(country, paired(names, second), source, supplementarySources ?? supplementary(country))
  }
}

// Data tables retain their original provenance and usage-right declarations.
for (const [country, names] of Object.entries(africaReviewedNames)) {
  localProvider(country, paired(names, { female: names.family, male: names.family }), nameSourceByCountry[country] ?? 'faker')
}
registerFamilyNames(europeReviewedNames, 'wikidata-europe-qlever-candidates')
registerFamilyNames(europeGenderedNames, 'wikidata-europe-qlever-candidates', ['wikidata-europe-gendered-families'])
registerFamilyNames(europeIslandNames, 'wikidata-europe-birthplace-candidates')
registerFamilyNames(asiaReviewedNames, 'wikidata-asia-qlever-candidates')
registerFamilyNames(asiaWestNames, 'wikidata-asia-qlever-candidates')
registerFamilyNames(asiaEastNames, 'wikidata-asia-qlever-candidates')
registerFamilyNames(asiaCentralNames, 'wikidata-asia-qlever-candidates')
registerFamilyNames(asiaAdditionalNames, 'wikidata-asia-qlever-candidates')
registerFamilyNames(northAmericaReviewedNames, 'wikidata-north-america-qlever-candidates')
registerFamilyNames(northAmericaTerritoryNames, 'wikidata-north-america-birthplace-candidates')
registerFamilyNames(oceaniaReviewedNames, 'wikidata-oceania-qlever-candidates')
registerFamilyNames(oceaniaTerritoryNames, 'wikidata-oceania-birthplace-candidates')
registerFamilyNames(southAmericaReviewedNames, 'wikidata-south-america-qlever-candidates')
registerFamilyNames(southAmericaTerritoryNames, 'wikidata-south-america-birthplace-candidates')
const faroeProvider = providers.get('FO')!
providers.set('FO', { ...faroeProvider, supplementarySources: ['faroe-name-statistics'] })
localProvider('MM', { strategy: 'full-name', given: myanmarGivenNames }, 'burmese-name-frequencies', supplementary('MM'), 'my_MM')
localProvider('BT', paired({ female: bhutanGivenNames.first, male: bhutanGivenNames.first }, { female: bhutanGivenNames.femaleSecond, male: bhutanGivenNames.maleSecond }), 'bhutan-naming-study')
localProvider('MW', paired({ female: malawiNames.given, male: malawiNames.given }, { female: malawiNames.family, male: malawiNames.family }), 'peace-corps-chichewa-names')
localProvider('ET', { strategy: 'patronymic', given: ethiopiaGivenNames, second: { female: ethiopiaGivenNames.male, male: ethiopiaGivenNames.male } }, 'tesfa-ethiopian-names')

export function resolveNameProvider(country: string): NameProvider | undefined {
  return providers.get(country)
}

export function reviewedNameCountryCodes(): string[] {
  return [...providers].filter(([, provider]) => provider.reviewed).map(([country]) => country)
}
