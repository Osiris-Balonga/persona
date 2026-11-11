import { parseArgs } from 'node:util'
import { listCountryNameDiversity } from '../src/geography/name-diversity.js'
import { geographicDataVersion } from '../src/geography/data-version.js'

const { values } = parseArgs({ options: { json: { type: 'boolean' }, limit: { type: 'string' } } })
const limit = values.limit === undefined ? undefined : Number(values.limit)
if (limit !== undefined && (!/^\d+$/.test(values.limit!) || !Number.isSafeInteger(limit) || limit < 1)) {
  throw new Error('--limit must be a positive integer')
}
const countries = listCountryNameDiversity()
const rows = countries.slice(0, limit)
if (values.json) {
  console.log(JSON.stringify({ dataVersion: geographicDataVersion, availableCountries: countries.length,
    below100Combinations: countries.filter(row => row.minimumCombinations < 100).length, rows }, null, 2))
} else {
  console.log(`Name diversity (${geographicDataVersion}): ${countries.length} available countries; ordered by smallest gender pool.`)
  console.table(rows.map(row => ({ Country: row.country, Name: row.name,
    'Female given': row.female.given, 'Male given': row.male.given,
    'Female combinations': row.female.combinations, 'Male combinations': row.male.combinations,
    Strategy: row.strategies.join(','), Issues: row.issues.length })))
  console.log('Counts deduplicate Unicode, case and whitespace variants and overlapping pools. They measure supported name strings, not population frequencies or unique people.')
}
