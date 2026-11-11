import { resolveNameProvider, reviewedNameCountryCodes } from './name-providers.js'
import { listCities } from './cities.js'
import { listCountries } from './countries.js'
import { nameContextForCountry } from './names.js'
import { addressRule, fictionalAddress, postalCodeForCity } from './address-data.js'
import { hasSyntheticStreet } from './street-data.js'
import { hasMobileExample, nanpTerritoryAreas } from './fictional-contact.js'
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

const pendingAsianNameReviewNotes: Record<string, string> = {
  BN: 'Mixed-community and title labels need a coherent Brunei sample',
  CC: 'No female citizenship-linked candidates; island-linked evidence needed',
  KH: 'Female and second-name components need Khmer field validation',
  LA: 'Locally plausible female and second components are sparse',
  MN: 'Given and patronymic placement needs a Mongolian source review',
  MO: 'Macau citizenship candidates are sparse; territory-linked evidence needed',
  MY: 'Malay, Chinese and Indian components need coherent community pairing',
  OM: 'Female and family labels are sparse and mixed with non-Omani candidates',
  TJ: 'Tajik given names and feminine family forms need review',
  TM: 'Turkmen given and gendered family forms need review',
}
const pendingNorthAmericaNameReviewNotes: Record<string, string> = {
  AI: 'Only five female birth-place candidates; local given-name evidence needed',
  BL: 'Two female birth-place candidates; local given and family pools needed',
  BQ: 'No country- or birth-place-linked name candidates',
  KY: 'Fifteen female birth-place candidates; local sample needs wider validation',
  MF: 'Six female birth-place candidates; local sample too sparse',
  MS: 'Twelve female birth-place candidates; local sample too sparse',
  PM: 'Six female birth-place candidates; local sample too sparse',
  SX: 'Eight female birth-place candidates; local sample too sparse',
  TC: 'Three female birth-place candidates; local sample too sparse',
  VG: 'Five female birth-place candidates; local sample too sparse',
}
const pendingOceaniaNameReviewNotes: Record<string, string> = {
  CX: 'No country- or birth-place-linked name candidates',
  KI: 'Female given-name candidates too sparse for a coherent local pool',
  MH: 'Female and second-name candidates need wider Marshallese evidence',
  MP: 'Birth-place female candidates too sparse for a local pool',
  NF: 'Female and male candidates too sparse for a local pool',
  NU: 'Female and second-name candidates too sparse for a local pool',
  PN: 'Small resident population and very sparse male and family candidates',
  TK: 'Only two female and one male birth-place candidates',
  TO: 'Female given-name candidates need wider Tongan evidence',
  TV: 'Only five female citizenship candidates and one birth-place candidate',
  WF: 'Female and family candidates too sparse for a local pool',
}

const addressReviewedCodes = new Set([
  ...reviewedNameCountryCodes(), 'SJ', 'VA',
  'AZ', 'BN', 'BT', 'CC', 'ID', 'KG', 'KH', 'KZ', 'LA', 'MM', 'MN', 'MO', 'MV', 'MY', 'OM', 'QA',
  'SG', 'TH', 'TJ', 'TM', 'UZ',
  'AI', 'BL', 'BQ', 'KY', 'MF', 'MS', 'PM', 'SX', 'TC', 'VG',
  'CX', 'KI', 'MH', 'MP', 'NF', 'NU', 'PN', 'TK', 'TO', 'TV', 'WF',
])

function addressCoverage(country: string): CoverageCell {
  const rule = addressRule(country)
  if (!rule) return pending()
  const cities = listCities(country)
  const missing: string[] = []
  if (rule.fallback) missing.push('global-format')
  if (rule.required.includes('S') && cities.some((city) => !city.region)) missing.push('region-unavailable')
  if (rule.required.includes('Z') && cities.some((city) => !postalCodeForCity(city))) missing.push('postal-code-unavailable')
  if (hasSyntheticStreet(country)) missing.push('synthetic-street')
  else missing.push('street-unavailable')
  const supplementarySources: GeographicSource[] = country === 'PN' ? ['upu-pitcairn'] : country === 'FK' ? ['upu-falkland']
    : cities.some((city) => postalCodeForCity(city)) ? ['geonames-postal'] : []
  if (hasSyntheticStreet(country)) supplementarySources.push('persona-policy')
  return { ...(missing.length ? partial('libaddressinput-data') : ingested('libaddressinput-data')),
    fallback: missing.length ? missing.join(',') : null,
    review: addressReviewedCodes.has(country) ? 'reviewed' as const : 'automated' as const,
    supplementarySources,
  }
}

export function listCoverage() {
  return listCountries().map((country) => {
    const resident = country.generation === 'eligible'
    const provider = resolveNameProvider(country.code)
    const nameContext = provider?.context
    const nameFallback = nameContext?.pools.filter((pool) => pool.tier !== 'local')
      .map((pool) => `${pool.tier}:${pool.locale}`).join(',') || null
    return {
      country: country.code,
      generation: country.generation,
      profileGeneration: profileGenerationStatus(country),
      registry: ingested('iso-3166'),
      callingCode: country.callingCode === null ? pending() : ingested('libphonenumber-js'),
      cities: resident && listCities(country.code).length > 0 ? { ...ingested('geonames'), supplementarySources: ['geonames-admin1'] } : resident ? pending() : notApplicable(),
      names: !resident ? notApplicable() : provider ? { ...ingested(provider.source),
        fallback: nameFallback,
        review: hasReviewedNamePool(country.code) ? 'reviewed' as const : 'automated' as const,
        reviewNote: pendingAsianNameReviewNotes[country.code]
          ?? pendingNorthAmericaNameReviewNotes[country.code]
          ?? pendingOceaniaNameReviewNotes[country.code] ?? null,
        supplementarySources: provider.supplementarySources,
      } : pending(),
      addresses: resident ? addressCoverage(country.code) : notApplicable(),
      phone: !resident ? notApplicable() : country.code === 'GB' ? ingested('ofcom')
        : country.code === 'AU' ? ingested('acma-fictional-numbers')
          : country.code === 'CA' ? { ...ingested('crtc-fictional-numbers'), supplementarySources: ['cnac-area-codes'] }
            : country.code === 'US' ? { ...ingested('nanpa'), supplementarySources: ['nanpa-area-codes'] }
              : nanpTerritoryAreas[country.code] ? { ...ingested('nanpa'), supplementarySources: ['nanpa-territory-areas'] }
                : country.code === 'FR' ? ingested('arcep-fictional-numbers')
                  : country.code === 'DE' ? ingested('bnetza-drama-numbers')
                    : country.code === 'IE' ? ingested('comreg-drama-numbers')
                      : country.code === 'SE' ? ingested('pts-fictional-numbers')
                        : country.code === 'NO' ? ingested('nkom-fictional-numbers')
                          : hasMobileExample(country.code) ? { ...partial('libphonenumber-js'), fallback: 'format-valid-unreserved' }
                            : pending(),
      distributions: resident ? { ...partial('persona-policy'),
        fallback: 'uniform-country,country-aware-appearance', supplementarySources: ['geonames'] } : notApplicable(),
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
        const components = resolveNameProvider(country.code)?.pools[pool.locale]
        const parts = components ? [...Object.values(components.given), ...('second' in components ? Object.values(components.second) : [])] : undefined
        if (!Number.isSafeInteger(pool.weight) || pool.weight < 1 || !parts
          || parts.some((part) => part.length === 0 || new Set(part).size !== part.length)) {
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
