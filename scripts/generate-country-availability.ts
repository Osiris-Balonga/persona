import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { listCountryAvailability } from '../src/geography/country-availability.js'
import { geographicDataVersion } from '../src/geography/data-version.js'

const path = resolve('docs/country-availability.md')
const rows = listCountryAvailability()
const available = rows.filter((row) => row.profile === 'available')
const coveredCities = available.reduce((sum, row) => sum + row.citiesWithPostcode, 0)
const sampledCities = available.reduce((sum, row) => sum + row.cities, 0)
const coveredCountries = available.filter((row) => row.citiesWithPostcode > 0).length
const lines = [
  '# Country data availability',
  '',
  `Data version: \`${geographicDataVersion}\`. This table is generated from the checked-in country, city, postal, name-review, and phone catalogues. Run \`npm run data:availability\` after changing those sources; \`npm run data:availability:check\` detects a stale table.`,
  '',
  `${available.length} of ${rows.length} assigned country and territory codes can generate profiles; ${rows.filter((row) => row.profile === 'pending-name-review').length} await local name review and ${rows.filter((row) => row.profile === 'unavailable').length} have no permanent resident profile. Among available codes, ${coveredCities} of ${sampledCities} sampled cities across ${coveredCountries} countries have a city-linked postcode.`,
  '',
  'A postcode count applies only to the sampled cities, not every address in a country. A zero means Persona returns `location.postcode: null` for every sampled city of that code. A nonzero count does not guarantee a postcode for every generated person. Synthetic street lines are illustrative and may not be deliverable. `format-valid` phones are not reserved and may belong to real subscribers; never contact them. Phone information for a pending profile describes source readiness, not an API response currently available for that nationality.',
  '',
  '| Code | Country or territory | Profile | Cities with postcode / sampled | Phone |',
  '| --- | --- | --- | ---: | --- |',
  ...rows.map((row) => `| ${row.code} | ${row.name.replaceAll('|', '\\|')} | ${row.profile} | ${row.citiesWithPostcode}/${row.cities} | ${row.phone} |`),
  '',
  'The current API exposes `GET /people`; it does not have a country-capability endpoint. This versioned table is the discoverable coverage reference for the beta. See the [API contract](api.md) for request and response rules and the [geographic data notes](geographic-data.md) for provenance and limitations.',
  '',
]
const content = lines.join('\n')
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8').catch(() => '') !== content) {
    throw new Error('Country availability table is out of date. Run npm run data:availability.')
  }
  console.log(`Country availability table is current (${rows.length} codes)`)
} else {
  await writeFile(path, content, 'utf8')
  console.log(`Wrote ${path} (${rows.length} codes)`)
}
