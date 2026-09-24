import { listCities } from './cities.js'
import { listCountries } from './countries.js'
import { nameContextForCountry } from './names.js'
import { namePoolData } from './name-pool-data.js'
import { andorraGivenNames } from './andorra-names.js'
import { bhutanGivenNames, myanmarGivenNames } from './surname-free-names.js'
import { malawiNames } from './malawi-names.js'
import { ethiopiaGivenNames } from './ethiopia-names.js'
import { africaReviewedNames, isAfricaReviewedCountry } from './africa-reviewed-names.js'
import { addressRule, fictionalAddress, postalCodeForCity, streetLanguageForCountry } from './address-data.js'
import { geographicSources, type GeographicSource } from './sources.js'
import { hasReviewedNamePool, profileGenerationStatus } from './profile-availability.js'

type CoverageStatus = 'ingested' | 'partial' | 'pending' | 'not-applicable'
type Source = GeographicSource | null
type CoverageCell = {
  status: CoverageStatus
  source: Source
  fallback: string | null
  review: 'pending' | 'automated' | 'reviewed'
  supplementarySources: readonly GeographicSource[]
}

const ingested = (source: Exclude<Source, null>): CoverageCell => ({
  status: 'ingested', source, fallback: null, review: 'automated', supplementarySources: [],
})
const partial = (source: Exclude<Source, null>): CoverageCell => ({
  status: 'partial', source, fallback: null, review: 'automated', supplementarySources: [],
})
const pending = (): CoverageCell => ({ status: 'pending', source: null, fallback: null, review: 'pending', supplementarySources: [] })
const notApplicable = (): CoverageCell => ({ status: 'not-applicable', source: null, fallback: null, review: 'pending', supplementarySources: [] })

const nameSourceByCountry: Record<string, GeographicSource> = {
  AD: 'andorra-civil-names', AO: 'wikidata-africa-name-batch', BF: 'wikidata-africa-name-batch',
  BJ: 'wikidata-africa-name-batch', BT: 'bhutan-naming-study', BW: 'botswana-parliament-names',
  CD: 'wikidata-africa-name-batch', CG: 'congo-senate-names',
  CI: 'wikidata-africa-qlever-candidates', CM: 'wikidata-africa-qlever-candidates',
  ET: 'tesfa-ethiopian-names', GH: 'wikidata-names', GM: 'wikidata-africa-qlever-candidates',
  GN: 'wikidata-africa-qlever-candidates', KE: 'wikidata-africa-qlever-candidates',
  LR: 'wikidata-africa-qlever-candidates', LS: 'lesotho-parliament-names',
  ML: 'wikidata-africa-qlever-candidates', MM: 'burmese-name-frequencies', MW: 'peace-corps-chichewa-names',
  NA: 'namibia-parliament-names', NG: 'wikidata-africa-qlever-candidates',
  RW: 'wikidata-names', SC: 'seychelles-parliament-names', SL: 'wikidata-africa-qlever-candidates',
  SN: 'wikidata-names', TG: 'wikidata-africa-qlever-candidates', TZ: 'wikidata-africa-qlever-candidates',
  UG: 'wikidata-africa-qlever-candidates', ZA: 'stats-sa-birth-names', ZM: 'wikidata-africa-qlever-candidates',
  ZW: 'wikidata-africa-qlever-candidates',
}
const nameSupplementaryByCountry: Record<string, readonly GeographicSource[]> = {
  AD: ['faker'], ET: ['uk-ethiopia-names'], GE: ['geonames-country-info', 'georgia-name-statistics'],
  GH: ['faker', 'ghana-parliament-names'], ID: ['geonames-country-info', 'uk-indonesia-names'],
  KE: ['kenya-parliament-names'], MM: ['uk-myanmar-names'], MW: ['ifla-malawi-names'],
  RW: ['rwanda-vital-names', 'rwanda-parliament-names'], SN: ['faker', 'senegal-presidency-names'],
  TZ: ['tanzania-parliament-names'], UG: ['uganda-parliament-names'],
  ZM: ['zambia-parliament-names'], ZW: ['zimbabwe-parliament-names'],
}

function addressCoverage(country: string): CoverageCell {
  const rule = addressRule(country)
  if (!rule) return pending()
  const cities = listCities(country)
  const missing: string[] = []
  if (rule.fallback) missing.push('global-format')
  if (rule.required.includes('S') && cities.some((city) => !city.region)) missing.push('region-unavailable')
  if (rule.required.includes('Z') && cities.some((city) => !postalCodeForCity(city))) missing.push('postal-code-unavailable')
  if (!/^(en|fr|es|pt|de|ja)$/.test(streetLanguageForCountry(country))) missing.push('global-street-style')
  return { ...(missing.length ? partial('libaddressinput-data') : ingested('libaddressinput-data')),
    fallback: missing.length ? missing.join(',') : null,
    supplementarySources: country === 'PN' ? ['upu-pitcairn']
      : cities.some((city) => postalCodeForCity(city)) ? ['geonames-postal'] : [],
  }
}

export function listCoverage() {
  return listCountries().map((country) => {
    const resident = country.generation === 'eligible'
    const nameContext = nameContextForCountry(country.code)
    const nameFallback = nameContext?.pools.filter((pool) => pool.tier !== 'local')
      .map((pool) => `${pool.tier}:${pool.locale}`).join(',') || null
    return {
      country: country.code,
      generation: country.generation,
      profileGeneration: profileGenerationStatus(country),
      registry: ingested('iso-3166'),
      callingCode: country.callingCode === null ? pending() : ingested('libphonenumber-js'),
      cities: resident && listCities(country.code).length > 0 ? { ...ingested('geonames'), supplementarySources: ['geonames-admin1'] } : resident ? pending() : notApplicable(),
      names: !resident ? notApplicable() : nameContext ? { ...ingested(nameSourceByCountry[country.code] ?? 'faker'),
        fallback: country.code === 'AD' ? 'language:es-family' : nameFallback,
        review: hasReviewedNamePool(country.code) ? 'reviewed' as const : 'automated' as const,
        supplementarySources: nameSupplementaryByCountry[country.code] ?? ['geonames-country-info'],
      } : pending(),
      addresses: resident ? addressCoverage(country.code) : notApplicable(),
      phone: !resident ? notApplicable() : country.code === 'GB' ? ingested('ofcom') : country.code === 'US' ? partial('nanpa') : pending(),
      distributions: resident ? { ...partial('persona-policy'),
        fallback: 'uniform-country,uniform-appearance', supplementarySources: ['geonames'] } : notApplicable(),
      portraits: resident ? pending() : notApplicable(),
    }
  })
}

export function validateGeographicData(): string[] {
  const errors: string[] = []
  for (const [id, source] of Object.entries(geographicSources)) {
    if (!source.url.startsWith('https://') || !source.license || !source.edition) {
      errors.push(`Missing provenance or usage right for ${id}`)
    }
  }
  const codes = new Set<string>()
  for (const country of listCountries()) {
    if (codes.has(country.code)) errors.push(`Duplicate country ${country.code}`)
    codes.add(country.code)
    if (!/^[A-Z]{2}$/.test(country.code) || !/^[A-Z]{3}$/.test(country.alpha3) || !/^\d{3}$/.test(country.numeric)) {
      errors.push(`Invalid ISO record ${country.code}`)
    }
    if (country.callingCode !== null && !/^\+[1-9]\d{0,2}$/.test(country.callingCode)) {
      errors.push(`Invalid calling code ${country.code}`)
    }
    const cities = listCities(country.code)
    if (country.generation === 'eligible' && cities.length === 0) errors.push(`Missing cities ${country.code}`)
    if (country.generation === 'unavailable' && cities.length > 0) errors.push(`Unexpected resident city ${country.code}`)
    const cityIds = new Set<number>()
    for (const city of cities) {
      if (city.country !== country.code || !city.name.trim() || !Number.isSafeInteger(city.geonameId)
        || !Number.isSafeInteger(city.population) || city.population < 0
        || city.latitude < -90 || city.latitude > 90 || city.longitude < -180 || city.longitude > 180
        || cityIds.has(city.geonameId)) {
        errors.push(`Invalid city ${country.code}/${city.name}`)
      }
      cityIds.add(city.geonameId)
      const rule = addressRule(country.code)
      const postalCode = postalCodeForCity(city)
      if (postalCode && (!rule?.postalPattern || !new RegExp(`^(?:${rule.postalPattern})$`, 'i').test(postalCode))) {
        errors.push(`Invalid postal code ${country.code}/${city.name}`)
      }
      const address = fictionalAddress(city, '0123456789abcdef'.repeat(4))
      if (!address.formatted.includes(city.name) || address.formatted.includes('%') || address.country !== country.code) {
        errors.push(`Incoherent address ${country.code}/${city.name}`)
      }
    }
    if (!addressRule(country.code)) errors.push(`Missing address rule ${country.code}`)
    if (country.generation === 'eligible') {
      const context = nameContextForCountry(country.code)
      if (!context || context.pools.length === 0) errors.push(`Missing name context ${country.code}`)
      if (hasReviewedNamePool(country.code)
        && (!context || context.fallback !== 'local' || context.pools.some((pool) => pool.tier !== 'local'))) {
        errors.push(`Reviewed name pool is not local ${country.code}`)
      }
      for (const pool of context?.pools ?? []) {
        const names = pool.locale === 'my_MM' ? myanmarGivenNames
          : pool.locale === 'ad_AD' ? andorraGivenNames
            : pool.locale === 'bt_BT' ? bhutanGivenNames
              : pool.locale === 'mw_MW' ? malawiNames
                : pool.locale === 'et_ET' ? ethiopiaGivenNames
                  : isAfricaReviewedCountry(country.code) ? africaReviewedNames[country.code] : namePoolData[pool.locale]
        if (!Number.isSafeInteger(pool.weight) || pool.weight < 1 || !names
          || Object.values(names).some((part) => part.length === 0 || new Set(part).size !== part.length)) {
          errors.push(`Invalid name pool ${country.code}/${pool.locale}`)
        }
      }
    }
  }
  for (const row of listCoverage()) {
    for (const [category, cell] of Object.entries(row)) {
      if (typeof cell !== 'object' || cell === null || !('status' in cell)) continue
      if ((cell.status === 'ingested' || cell.status === 'partial') && (!cell.source || !geographicSources[cell.source as GeographicSource])) {
        errors.push(`Unlicensed ${category} data for ${row.country}`)
      }
      for (const source of cell.supplementarySources ?? []) {
        if (!geographicSources[source as GeographicSource]) errors.push(`Unlicensed ${category} supplementary data for ${row.country}`)
      }
    }
  }
  return errors
}
