import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync, strFromU8 } from 'fflate'
import { countryData } from '../src/geography/country-data.ts'
import { geographicSources } from '../src/geography/sources.ts'

const [archivePath, edition] = process.argv.slice(2)
if (!archivePath || !/^\d{4}-\d{2}-\d{2}$/.test(edition ?? '')) {
  throw new Error('Usage: node scripts/refresh-city-data.mjs <cities1000.zip> <YYYY-MM-DD>')
}

const archive = readFileSync(archivePath)
const digest = createHash('sha256').update(archive).digest('hex')
if (digest !== geographicSources.geonames.sha256 || edition !== geographicSources.geonames.edition) {
  throw new Error('GeoNames archive or edition differs from the reviewed source manifest')
}
const members = unzipSync(archive, { filter: (file) => file.name === 'cities1000.txt' })
const input = members['cities1000.txt']
if (!input) throw new Error('GeoNames cities1000.txt is missing from archive')

const eligible = new Set(countryData.filter((country) => country.generation === 'eligible').map((country) => country.code))
const byCountry = new Map([...eligible].map((code) => [code, []]))
for (const line of strFromU8(input).split('\n')) {
  if (!line) continue
  const columns = line.split('\t')
  const [id, name, , , , , featureClass, featureCode, country, , admin1, , , , population] = columns
  if (!eligible.has(country) || featureClass !== 'P' || !/^PPL/.test(featureCode)) continue
  const geonameId = Number(id)
  const count = Number(population)
  if (!Number.isSafeInteger(geonameId) || !Number.isSafeInteger(count) || !name.trim()) continue
  byCountry.get(country).push({ geonameId, name: name.trim(), country, admin1, population: count, featureCode })
}

const selected = []
for (const country of countryData) {
  if (!eligible.has(country.code)) continue
  const candidates = byCountry.get(country.code)
  candidates.sort((a, b) => b.population - a.population || a.geonameId - b.geonameId)
  const entries = candidates.slice(0, 12)
  const capital = candidates.find((city) => city.featureCode === 'PPLC')
  if (capital && !entries.some((city) => city.geonameId === capital.geonameId)) entries.push(capital)
  const unique = new Set()
  const cities = entries.filter((city) => {
    const key = city.name.toLocaleLowerCase('en')
    if (unique.has(key)) return false
    unique.add(key)
    return true
  })
  if (cities.length === 0) throw new Error(`No locality for eligible code ${country.code}`)
  selected.push(...cities.map(({ featureCode, ...city }) => city))
}

const output = [
  `// GeoNames cities1000.zip, CC BY 4.0, SHA-256 ${digest}; see docs/geographic-data.md.`,
  `export const cityEdition = '${edition}'`,
  'export const cityData = [',
  ...selected.map((city) => `  ${JSON.stringify(city)},`),
  '] as const',
  '',
].join('\n')
writeFileSync(fileURLToPath(new URL('../src/geography/city-data.ts', import.meta.url)), output)
