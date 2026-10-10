import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { unzipSync, strFromU8 } from 'fflate'
import { countryData } from '../src/geography/country-data.ts'
import { cityData } from '../src/geography/city-data.ts'
import { geographicSources } from '../src/geography/sources.ts'

const [metadataPath, postalPath] = process.argv.slice(2)
if (!metadataPath || !postalPath) {
  throw new Error('Usage: node scripts/refresh-address-data.mjs <address-metadata.json> <postal-allCountries.zip>')
}
const metadataBytes = readFileSync(metadataPath)
const postalBytes = readFileSync(postalPath)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
if (sha256(metadataBytes) !== geographicSources['libaddressinput-data'].sha256
  || sha256(postalBytes) !== geographicSources['geonames-postal'].sha256) {
  throw new Error('Address source differs from the reviewed source manifest')
}
const metadata = JSON.parse(metadataBytes.toString('utf8'))
const fallback = { fmt: '%N%n%O%n%A%n%C', require: 'AC' }
const rules = {}
const postalPatterns = new Map()
for (const country of countryData) {
  const source = metadata[country.code]
  if (!source) throw new Error(`Missing address metadata ${country.code}`)
  rules[country.code] = {
    format: source.fmt ?? fallback.fmt,
    required: source.require ?? fallback.require,
    postalPattern: source.zip ?? null,
    fallback: !source.fmt,
  }
  if (source.zip) {
    try { postalPatterns.set(country.code, new RegExp(`^(?:${source.zip})$`, 'i')) }
    catch { throw new Error(`Invalid postal pattern ${country.code}`) }
  }
}

function fold(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}
function distanceKm(a, b, lat, lon) {
  const toRadians = Math.PI / 180
  const dLat = (lat - a) * toRadians
  const dLon = (lon - b) * toRadians
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * toRadians) * Math.cos(lat * toRadians) * Math.sin(dLon / 2) ** 2
  return 12_742 * Math.asin(Math.min(1, Math.sqrt(h)))
}

const byName = new Map()
for (const city of cityData) {
  const key = `${city.country}:${fold(city.name)}`
  const places = byName.get(key) ?? []
  places.push(city)
  byName.set(key, places)
}
const nearest = new Map()
const archive = unzipSync(postalBytes, { filter: (file) => file.name === 'allCountries.txt' })
if (!archive['allCountries.txt']) throw new Error('GeoNames postal file is missing')
const input = strFromU8(archive['allCountries.txt'])
let start = 0
while (start < input.length) {
  const end = input.indexOf('\n', start)
  const line = input.slice(start, end < 0 ? undefined : end)
  start = end < 0 ? input.length : end + 1
  const columns = line.split('\t')
  const [country, postalCode, placeName, , , , , , , rawLat, rawLon] = columns
  const matches = byName.get(`${country}:${fold(placeName ?? '')}`)
  if (!matches?.length || !postalPatterns.get(country)?.test(postalCode)) continue
  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
  for (const city of matches) {
    const distance = distanceKm(city.latitude, city.longitude, lat, lon)
    if (distance > 25) continue
    const prior = nearest.get(city.geonameId)
    if (!prior || distance < prior.distance || distance === prior.distance && postalCode < prior.postalCode) {
      nearest.set(city.geonameId, { postalCode, distance })
    }
  }
}

const postalCodes = Object.fromEntries([...nearest].sort(([a], [b]) => a - b)
  .map(([id, value]) => [id, value.postalCode]))
const lines = (records) => ['{', ...Object.entries(records).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`), '}'].join('\n')
const output = [
  '// Google Address Data Service and GeoNames postal extracts, both CC BY 4.0; see docs/geographic-data.md.',
  'export type AddressRule = { format: string; required: string; postalPattern: string | null; fallback: boolean }',
  `export const addressRules: Record<string, AddressRule> = ${lines(rules)}`,
  `export const cityPostalCodes: Record<number, string> = ${lines(postalCodes)}`,
  '',
].join('\n')
writeFileSync(fileURLToPath(new URL('../src/geography/address-rules-data.ts', import.meta.url)), output)
console.log(`Address rules: ${Object.keys(rules).length}; city-linked postal codes: ${Object.keys(postalCodes).length}`)
