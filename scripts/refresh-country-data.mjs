import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { iso31661 } from 'iso-3166'
import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

const edition = '2026-09-24'
const withoutPermanentResidents = new Set(['AQ', 'BV', 'GS', 'HM', 'IO', 'TF', 'UM'])
const phoneRegions = new Set(getCountries())

if (iso31661.length !== 249 || new Set(iso31661.map(({ alpha2 }) => alpha2)).size !== 249) {
  throw new Error('Unexpected ISO 3166-1 registry size or duplicate code')
}
for (const code of withoutPermanentResidents) {
  if (!iso31661.some(({ alpha2 }) => alpha2 === code)) throw new Error(`Unknown territory: ${code}`)
}

const records = iso31661.map(({ alpha2, alpha3, numeric, name }) => ({
  code: alpha2,
  alpha3,
  numeric,
  name,
  callingCode: phoneRegions.has(alpha2) ? `+${getCountryCallingCode(alpha2)}` : null,
  generation: withoutPermanentResidents.has(alpha2) ? 'unavailable' : 'eligible',
}))

const output = [
  `// Source snapshot: iso-3166@4.4.0 and libphonenumber-js@1.13.14; see docs/geographic-data.md.`,
  `export const registryEdition = '${edition}'`,
  'export const countryData = [',
  ...records.map((record) => `  ${JSON.stringify(record)},`),
  '] as const',
  '',
].join('\n')

writeFileSync(fileURLToPath(new URL('../src/geography/country-data.ts', import.meta.url)), output)
