import { writeFileSync } from 'node:fs'
import { countryData } from '../src/geography/country-data.ts'

const outputPath = process.argv[2]
if (!outputPath) throw new Error('Usage: node scripts/fetch-address-metadata.mjs <output.json>')

const codes = countryData.map((country) => country.code)
const metadata = new Map()
let cursor = 0
async function worker() {
  while (cursor < codes.length) {
    const code = codes[cursor++]
    const response = await fetch(`https://chromium-i18n.appspot.com/ssl-address/data/${code}`)
    if (!response.ok) throw new Error(`Address metadata ${code}: HTTP ${response.status}`)
    metadata.set(code, await response.json())
  }
}
await Promise.all(Array.from({ length: 8 }, () => worker()))
writeFileSync(outputPath, JSON.stringify(Object.fromEntries(codes.map((code) => [code, metadata.get(code)]))))
