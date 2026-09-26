import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { allLocales } from '@faker-js/faker'
import { countryData } from '../src/geography/country-data.ts'
import { geographicSources } from '../src/geography/sources.ts'

const [countryInfoPath] = process.argv.slice(2)
if (!countryInfoPath) throw new Error('Usage: node scripts/refresh-name-data.mjs <countryInfo.txt>')
const input = readFileSync(countryInfoPath)
const digest = createHash('sha256').update(input).digest('hex')
if (digest !== geographicSources['geonames-country-info'].sha256) {
  throw new Error('GeoNames countryInfo.txt differs from the reviewed source manifest')
}

const rows = new Map()
for (const line of input.toString('utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue
  const columns = line.split('\t')
  rows.set(columns[0], (columns[15] ?? '').split(',').filter(Boolean))
}

function hasNames(locale) {
  const person = allLocales[locale]?.person
  return Boolean(person && Object.values(person.first_name ?? {}).flat().length && Object.values(person.last_name ?? {}).flat().length)
}

const languageVariants = {
  af: 'af_ZA', bn: 'bn_BD', cs: 'cs_CZ', id: 'id_ID', ka: 'ka_GE',
  nb: 'nb_NO', pt: 'pt_PT', sl: 'sl_SI', sr: 'sr_RS_latin',
  ta: 'ta_IN', uz: 'uz_UZ_latin', yo: 'yo_NG', zh: 'zh_CN', zu: 'zu_ZA',
}

// Public Service Development Agency counts reported in 2024; see docs/geographic-data.md.
const reviewedGivenNames = {
  ka_GE: {
    female: ['ნინო', 'მარიამ', 'ანა', 'თამარ', 'მარიამი', 'მაია', 'ნანა', 'ელენე', 'ნათია', 'მანანა'],
    male: ['გიორგი', 'დავით', 'ალექსანდრე', 'ლუკა', 'ნიკოლოზ', 'ირაკლი', 'ზურაბ', 'საბა', 'ლევან', 'დავითი'],
  },
}

function matchLocale(tag, country) {
  const exact = tag.replace('-', '_')
  if (tag.includes('-') && hasNames(exact)) {
    return { locale: exact, tier: tag.toUpperCase().endsWith(`-${country}`) ? 'local' : 'language' }
  }
  const language = tag.split('-')[0].toLowerCase()
  if (hasNames(language)) return { locale: language, tier: 'language' }
  const variant = languageVariants[language]
  if (variant && hasNames(variant)) return { locale: variant, tier: variant.endsWith(`_${country}`) ? 'local' : 'language' }
  return null
}

const contexts = {}
const usedLocales = new Set()
for (const country of countryData) {
  if (country.generation !== 'eligible') continue
  const languages = rows.get(country.code) ?? []
  const pools = []
  for (const [index, tag] of languages.entries()) {
    const match = matchLocale(tag, country.code)
    if (!match || pools.some((pool) => pool.locale === match.locale)) continue
    pools.push({ ...match, weight: index === 0 ? 4 : index === 1 ? 2 : 1 })
  }
  if (pools.some((pool) => pool.tier === 'local')) {
    pools.splice(0, pools.length, ...pools.filter((pool) => pool.tier === 'local'))
  }
  if (pools.length === 0) pools.push({ locale: 'en', tier: 'global', weight: 1 })
  for (const pool of pools) usedLocales.add(pool.locale)
  const fallback = pools.some((pool) => pool.tier === 'global') ? 'global'
    : pools.some((pool) => pool.tier === 'language') ? 'language' : 'local'
  contexts[country.code] = { pools, fallback }
}

function sample(values, limit = 96) {
  const unique = [...new Set(values.filter((name) => typeof name === 'string' && name.trim()))]
  if (unique.length <= limit) return unique
  return Array.from({ length: limit }, (_, index) => unique[Math.floor(index * unique.length / limit)])
}

const poolData = {}
for (const locale of [...usedLocales].sort()) {
  const { first_name: first, last_name: last } = allLocales[locale].person
  const genericFirst = first.generic ?? []
  const genericLast = last.generic ?? []
  const reviewedFirst = reviewedGivenNames[locale]
  poolData[locale] = {
    female: sample(reviewedFirst?.female ?? first.female ?? genericFirst),
    male: sample(reviewedFirst?.male ?? first.male ?? genericFirst),
    lastFemale: sample(last.female ?? genericLast),
    lastMale: sample(last.male ?? genericLast),
  }
  if (Object.values(poolData[locale]).some((names) => names.length === 0)) {
    throw new Error(`Incomplete first/last names in locale ${locale}`)
  }
}

const header = `// GeoNames countryInfo.txt (CC BY 4.0), @faker-js/faker 10.6.0 (MIT), and reviewed Georgian given-name statistics; see docs/geographic-data.md.\n`
const compactEntries = (records) => ['{',
  ...Object.entries(records).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
  '}'].join('\n')
writeFileSync(fileURLToPath(new URL('../src/geography/name-context-data.ts', import.meta.url)),
  `${header}export type NameContext = { pools: readonly { locale: string; tier: 'local' | 'language' | 'global'; weight: number }[]; fallback: 'local' | 'language' | 'global' }\nexport const nameContextData: Record<string, NameContext> = ${compactEntries(contexts)}\n`)
writeFileSync(fileURLToPath(new URL('../src/geography/name-pool-data.ts', import.meta.url)),
  `${header}export type NamePool = { female: readonly string[]; male: readonly string[]; lastFemale: readonly string[]; lastMale: readonly string[] }\nexport const namePoolData: Record<string, NamePool> = ${compactEntries(poolData)}\n`)
