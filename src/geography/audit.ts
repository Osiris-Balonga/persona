import { createGenerationContext } from '../replay.js'
import { fictionalAddress } from './address-data.js'
import { listCoverage, validateGeographicData } from './coverage.js'
import { listCountries, registryEdition } from './countries.js'
import { resolveGeographicContext } from './distribution.js'
import { fictionalEmail, fictionalPhone } from './fictional-contact.js'
import { selectName } from './names.js'
import { geographicDataVersion } from './data-version.js'

const versions = { dataVersion: geographicDataVersion, catalogVersion: 'empty-v1' }
const reviewedCategories = ['names', 'addresses'] as const
const dataCategories = ['names', 'addresses', 'phone', 'distributions'] as const

export function auditGeographicData() {
  const countries = listCountries()
  const errors = validateGeographicData()
  const gaps: { country: string; categories: string[] }[] = []
  let sampledCodes = 0

  for (const row of listCoverage()) {
    if (row.generation !== 'eligible') continue
    const categories: string[] = []
    for (const category of dataCategories) {
      const cell = row[category]
      if (cell.status !== 'ingested') categories.push(`${category}:${cell.status}`)
      if (reviewedCategories.includes(category as typeof reviewedCategories[number]) && cell.review !== 'reviewed') {
        categories.push(`${category}:review-pending`)
      }
      if (cell.fallback) categories.push(`${category}:fallback:${cell.fallback}`)
    }
    if (categories.length) gaps.push({ country: row.country, categories })

    for (const gender of ['female', 'male'] as const) {
      const query = { count: 1, asOf: registryEdition, country: row.country,
        gender, seed: 'geographic-audit' }
      const context = createGenerationContext(query, versions)
      const geography = resolveGeographicContext(query, context.componentKey(0, 'geography'))
      const name = selectName(row.country, gender, context.componentKey(0, 'identity'))
      const address = fictionalAddress(geography.city, context.componentKey(0, 'address'))
      const email = fictionalEmail(name.firstName, name.lastName, context.componentKey(0, 'email'))
      const phone = fictionalPhone(row.country, geography.city.name, context.componentKey(0, 'phone'))
      const country = countries.find((entry) => entry.code === row.country)
      if (geography.country.code !== row.country || geography.city.country !== row.country
        || address.country !== row.country || address.city !== geography.city.name
        || !address.formatted.includes(geography.city.name)
        || !name.firstName || !name.lastName || name.fullName !== `${name.firstName} ${name.lastName}`
        || !email.endsWith('@example.test')
        || phone !== null && (!country?.callingCode || !phone.startsWith(country.callingCode))) {
        errors.push(`Incoherent controlled sample ${row.country}/${gender}`)
      }
    }
    sampledCodes++
  }

  return {
    dataVersion: geographicDataVersion,
    registryCodes: countries.length,
    eligibleCodes: countries.filter((country) => country.generation === 'eligible').length,
    unavailableCodes: countries.filter((country) => country.generation === 'unavailable').length,
    sampledCodes,
    errors,
    gaps,
  }
}
