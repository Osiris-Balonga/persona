import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const endpoint = 'https://query.wikidata.org/sparql'
const userAgent = 'PersonaProject/0.1 (geographic data research; github.com/Osiris-Balonga/persona)'
const male = 'Q6581097'
const female = 'Q6581072'

function cleanName(value) {
  if (typeof value !== 'string') return null
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (name.length < 2 || name.length > 64 || /^Q\d+$/u.test(name)
    || !/^[\p{L}\p{M}][\p{L}\p{M} '’\-]*$/u.test(name)) return null
  return name
}

function ranked(rows, code, sex, limit) {
  const counts = new Map()
  let rejected = 0
  for (const row of rows) {
    if (row.code !== code || (sex !== null && row.sex !== sex)) continue
    const name = cleanName(row.name)
    if (!name || !Number.isSafeInteger(row.count) || row.count < 1) {
      rejected++
      continue
    }
    counts.set(name, (counts.get(name) ?? 0) + row.count)
  }
  const entries = [...counts].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return { entries: entries.slice(0, limit), total: entries.length, rejected }
}

export function summarizeCandidates(givenRows, familyRows, codes, limit = 200) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('Invalid candidate limit')
  const result = {}
  for (const code of codes) {
    const women = ranked(givenRows, code, 'female', limit)
    const men = ranked(givenRows, code, 'male', limit)
    const surnames = ranked(familyRows, code, null, limit)
    const maleNames = new Set(men.entries.map((entry) => entry.name))
    result[code] = {
      counts: { female: women.total, male: men.total, family: surnames.total },
      rejectedLabels: { female: women.rejected, male: men.rejected, family: surnames.rejected },
      ambiguousGivenNames: women.entries.map((entry) => entry.name).filter((name) => maleNames.has(name)),
      female: women.entries, male: men.entries, family: surnames.entries,
    }
  }
  return result
}

function queryFor(codes, kind) {
  const values = codes.map((code) => `"${code}"`).join(' ')
  const property = kind === 'given' ? 'P735' : 'P734'
  const gender = kind === 'given' ? `?person wdt:P21 ?sex. VALUES ?sex { wd:${male} wd:${female} }` : ''
  const selectGender = kind === 'given' ? '?sex ' : ''
  return `SELECT ?iso ${selectGender}?nameLabel (COUNT(DISTINCT ?person) AS ?n) WHERE {
    VALUES ?iso { ${values} }
    ?country wdt:P297 ?iso.
    ?person wdt:P27 ?country; wdt:${property} ?name.
    ${gender}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
  } GROUP BY ?iso ${selectGender}?nameLabel`
}

async function fetchBindings(query) {
  const url = `${endpoint}?format=json&query=${encodeURIComponent(query)}`
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': userAgent },
      signal: AbortSignal.timeout(60_000),
    })
    if (response.ok) return (await response.json()).results.bindings
    if (response.status !== 429 || attempt === 1) throw new Error(`Wikidata query failed: HTTP ${response.status}`)
    const retryAfter = Math.min(60, Number(response.headers.get('retry-after')) || 10)
    await new Promise((done) => setTimeout(done, retryAfter * 1000))
  }
  throw new Error('Wikidata query did not complete')
}

function parseBindings(bindings, kind) {
  return bindings.map((binding) => ({
    code: binding.iso?.value,
    name: binding.nameLabel?.value,
    count: Number(binding.n?.value),
    ...(kind === 'given' ? { sex: binding.sex?.value?.endsWith(male) ? 'male'
      : binding.sex?.value?.endsWith(female) ? 'female' : null } : {}),
  }))
}

function argumentsFrom(argv) {
  const options = Object.fromEntries(argv.map((argument) => {
    const match = /^--([^=]+)=(.+)$/u.exec(argument)
    if (!match) throw new Error(`Invalid argument: ${argument}`)
    return [match[1], match[2]]
  }))
  if (!options.countries || !options.output) {
    throw new Error('Usage: node scripts/collect-wikidata-name-candidates.mjs --countries=GH,SN --output=report.json')
  }
  const codes = [...new Set(options.countries.split(',').map((code) => code.trim().toUpperCase()))]
  if (codes.some((code) => !/^[A-Z]{2}$/u.test(code))) throw new Error('Invalid country code')
  return { codes, output: resolve(options.output) }
}

async function main() {
  const { codes, output } = argumentsFrom(process.argv.slice(2))
  const givenRows = []
  const familyRows = []
  const queries = []
  for (let offset = 0; offset < codes.length; offset += 3) {
    const batch = codes.slice(offset, offset + 3)
    const given = queryFor(batch, 'given')
    const family = queryFor(batch, 'family')
    queries.push({ codes: batch, given, family })
    givenRows.push(...parseBindings(await fetchBindings(given), 'given'))
    familyRows.push(...parseBindings(await fetchBindings(family), 'family'))
    process.stderr.write(`Collected candidates for ${batch.join(', ')}\n`)
  }
  const report = {
    source: endpoint,
    license: 'CC0-1.0',
    retrievedAt: new Date().toISOString(),
    selection: 'P27 citizenship, P21 sex or gender, P735 given name, P734 family name; grouped counts',
    queries,
    sourceRowsSha256: createHash('sha256').update(JSON.stringify({ givenRows, familyRows })).digest('hex'),
    note: 'Candidate names require country-level QA before entering the runtime catalog; counts reflect Wikidata coverage, not population frequency.',
    countries: summarizeCandidates(givenRows, familyRows, codes),
  }
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  for (const code of codes) process.stdout.write(`${code} ${JSON.stringify(report.countries[code].counts)}\n`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
}
