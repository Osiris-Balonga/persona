import { listCities } from './cities.js'
import { listCountries } from './countries.js'
import { nameContextForCountry } from './names.js'
import { namePoolData } from './name-pool-data.js'
import { geographicSources, type GeographicSource } from './sources.js'

type CoverageStatus = 'ingested' | 'partial' | 'pending' | 'not-applicable'
type Source = GeographicSource | null
type CoverageCell = {
  status: CoverageStatus
  source: Source
  fallback: string | null
  review: 'pending' | 'automated'
}

const ingested = (source: Exclude<Source, null>): CoverageCell => ({
  status: 'ingested', source, fallback: null, review: 'automated',
})
const partial = (source: Exclude<Source, null>): CoverageCell => ({
  status: 'partial', source, fallback: null, review: 'automated',
})
const pending = (): CoverageCell => ({ status: 'pending', source: null, fallback: null, review: 'pending' })
const notApplicable = (): CoverageCell => ({ status: 'not-applicable', source: null, fallback: null, review: 'pending' })

export function listCoverage() {
  return listCountries().map((country) => {
    const resident = country.generation === 'eligible'
    const nameContext = nameContextForCountry(country.code)
    const nameFallback = nameContext?.pools.filter((pool) => pool.tier !== 'local')
      .map((pool) => `${pool.tier}:${pool.locale}`).join(',') || null
    return {
      country: country.code,
      generation: country.generation,
      registry: ingested('iso-3166'),
      callingCode: country.callingCode === null ? pending() : ingested('libphonenumber-js'),
      cities: resident && listCities(country.code).length > 0 ? ingested('geonames') : resident ? pending() : notApplicable(),
      names: !resident ? notApplicable() : nameContext ? { ...ingested('faker'), fallback: nameFallback } : pending(),
      addresses: resident ? pending() : notApplicable(),
      phone: !resident ? notApplicable() : country.code === 'GB' ? ingested('ofcom') : country.code === 'US' ? partial('nanpa') : pending(),
      distributions: resident ? pending() : notApplicable(),
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
      if (city.country !== country.code || !city.name.trim() || !Number.isSafeInteger(city.geonameId) || cityIds.has(city.geonameId)) {
        errors.push(`Invalid city ${country.code}/${city.name}`)
      }
      cityIds.add(city.geonameId)
    }
    if (country.generation === 'eligible') {
      const context = nameContextForCountry(country.code)
      if (!context || context.pools.length === 0) errors.push(`Missing name context ${country.code}`)
      for (const pool of context?.pools ?? []) {
        const names = namePoolData[pool.locale]
        if (!Number.isSafeInteger(pool.weight) || pool.weight < 1 || !names || Object.values(names).some((part) => part.length === 0)) {
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
    }
  }
  return errors
}
