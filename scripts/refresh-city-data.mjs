import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync, strFromU8 } from 'fflate'
import { countryData } from '../src/geography/country-data.ts'
import { geographicSources } from '../src/geography/sources.ts'

const [archivePath, edition, admin1Path] = process.argv.slice(2)
if (!archivePath || !admin1Path || !/^\d{4}-\d{2}-\d{2}$/.test(edition ?? '')) {
  throw new Error('Usage: node scripts/refresh-city-data.mjs <cities1000.zip> <YYYY-MM-DD> <admin1CodesASCII.txt>')
}

const archive = readFileSync(archivePath)
const digest = createHash('sha256').update(archive).digest('hex')
if (digest !== geographicSources.geonames.sha256 || edition !== geographicSources.geonames.edition) {
  throw new Error('GeoNames archive or edition differs from the reviewed source manifest')
}
const members = unzipSync(archive, { filter: (file) => file.name === 'cities1000.txt' })
const input = members['cities1000.txt']
if (!input) throw new Error('GeoNames cities1000.txt is missing from archive')
const adminInput = readFileSync(admin1Path)
if (createHash('sha256').update(adminInput).digest('hex') !== geographicSources['geonames-admin1'].sha256) {
  throw new Error('GeoNames admin1 archive differs from the reviewed source manifest')
}
const regions = new Map(adminInput.toString('utf8').split('\n').filter(Boolean).map((line) => {
  const [code, name] = line.split('\t')
  return [code, name]
}))

const eligible = new Set(countryData.filter((country) => country.generation === 'eligible').map((country) => country.code))
const byCountry = new Map([...eligible].map((code) => [code, []]))
for (const line of strFromU8(input).split('\n')) {
  if (!line) continue
  const columns = line.split('\t')
  const [id, name, , , latitude, longitude, featureClass, featureCode, country, , admin1, , , , population] = columns
  if (!eligible.has(country) || featureClass !== 'P' || !/^PPL/.test(featureCode)) continue
  const geonameId = Number(id)
  const count = Number(population)
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isSafeInteger(geonameId) || !Number.isSafeInteger(count) || !name.trim()
    || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue
  byCountry.get(country).push({ geonameId, name: name.trim(), country, admin1,
    region: regions.get(`${country}.${admin1}`) ?? null, latitude: lat, longitude: lon,
    population: count, featureCode })
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
