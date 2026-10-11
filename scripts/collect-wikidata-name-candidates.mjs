import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const endpoint = 'https://query.wikidata.org/sparql'
const qleverEndpoint = 'https://qlever.dev/api/wikidata'
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

export function queryFor(codes, kind, engine = 'wikidata', basis = 'citizenship') {
  if (!['citizenship', 'birthplace'].includes(basis)) throw new Error('Invalid country association basis')
  const values = codes.map((code) => `"${code}"`).join(' ')
  const property = kind === 'given' ? 'P735' : 'P734'
  const gender = kind === 'given' ? `?person wdt:P21 ?sex. VALUES ?sex { wd:${male} wd:${female} }` : ''
  const selectGender = kind === 'given' ? '?sex ' : ''
  const prefixes = engine === 'qlever' ? `PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
` : ''
  const labels = engine === 'qlever'
    ? '?name rdfs:label ?nameLabel. FILTER(LANG(?nameLabel) = "en")'
    : 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }'
  return `${prefixes}SELECT ?iso ${selectGender}?nameLabel (COUNT(DISTINCT ?person) AS ?n) WHERE {
    VALUES ?iso { ${values} }
    ?country wdt:P297 ?iso.
    ${basis === 'birthplace' ? '?person wdt:P19/wdt:P131* ?country' : '?person wdt:P27 ?country'}; wdt:${property} ?name.
    ${gender}
    ${labels}
  } GROUP BY ?iso ${selectGender}?nameLabel`
}

async function fetchBindings(query, engine) {
  const qlever = engine === 'qlever'
  const url = qlever ? qleverEndpoint : `${endpoint}?format=json&query=${encodeURIComponent(query)}`
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, {
      ...(qlever ? { method: 'POST', body: query } : {}),
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': userAgent,
        ...(qlever ? { 'Content-Type': 'application/sparql-query' } : {}) },
      signal: AbortSignal.timeout(qlever ? 45_000 : 60_000),
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
  const engine = options.engine ?? 'wikidata'
  if (!['wikidata', 'qlever'].includes(engine)) throw new Error('Invalid SPARQL engine')
  const basis = options.basis ?? 'citizenship'
  if (!['citizenship', 'birthplace'].includes(basis)) throw new Error('Invalid country association basis')
  return { codes, output: resolve(options.output), engine, basis }
}

export async function collectCandidates(codes, previous, fetchRows, save, engine = 'wikidata', basis = 'citizenship') {
  if (previous && (previous.schemaVersion !== 2
    || JSON.stringify(previous.requestedCodes) !== JSON.stringify(codes)
    || (previous.basis ?? 'citizenship') !== basis)) {
    throw new Error('Existing report has a different format or country list; choose another output path')
  }
  const report = previous ?? {
    schemaVersion: 2,
    source: engine === 'qlever' ? qleverEndpoint : endpoint,
    license: 'CC0-1.0',
    requestedCodes: codes,
    ...(basis === 'birthplace' ? { basis } : {}),
    selection: `${basis === 'birthplace' ? 'P19/P131* birth place hierarchy' : 'P27 citizenship'}, P21 sex or gender, P735 given name, P734 family name; grouped counts`,
    note: 'Candidate names require country-level QA before entering the runtime catalog; counts reflect Wikidata coverage, not population frequency.',
    countries: {},
    failures: {},
  }
  let consecutiveFailures = 0
  for (const code of codes) {
    if (report.countries[code]) continue
    try {
      const givenRows = await fetchRows(code, 'given')
      const familyRows = await fetchRows(code, 'family')
      report.countries[code] = {
        ...summarizeCandidates(givenRows, familyRows, [code])[code],
        retrievedAt: new Date().toISOString(),
        source: engine === 'qlever' ? qleverEndpoint : endpoint,
        queries: { given: queryFor([code], 'given', engine, basis), family: queryFor([code], 'family', engine, basis) },
        sourceRowsSha256: createHash('sha256').update(JSON.stringify({ givenRows, familyRows })).digest('hex'),
      }
      delete report.failures[code]
      consecutiveFailures = 0
      process.stderr.write(`Collected candidates for ${code}\n`)
    } catch (error) {
      report.failures[code] = error instanceof Error ? error.message : String(error)
      consecutiveFailures++
      process.stderr.write(`Failed ${code}: ${report.failures[code]}\n`)
    }
    await save(report)
    if (consecutiveFailures >= 2) {
      process.stderr.write('Stopped after two consecutive country failures; rerun to retry.\n')
      break
    }
  }
  return report
}

export function formatCandidateReport(report) {
  const metadata = Object.entries(report).filter(([key]) => key !== 'countries')
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
  const countries = Object.entries(report.countries)
    .map(([code, value]) => `    ${JSON.stringify(code)}: ${JSON.stringify(value)}`)
  return `{\n${metadata.join(',\n')},\n  "countries": {\n${countries.join(',\n')}\n  }\n}\n`
}

async function saveReport(output, report) {
  await mkdir(dirname(output), { recursive: true })
  const temporary = `${output}.tmp`
  await writeFile(temporary, formatCandidateReport(report), 'utf8')
  await rename(temporary, output)
}

async function main() {
  const { codes, output, engine, basis } = argumentsFrom(process.argv.slice(2))
  let previous = null
  try { previous = JSON.parse(await readFile(output, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const report = await collectCandidates(codes, previous,
    async (code, kind) => parseBindings(await fetchBindings(queryFor([code], kind, engine, basis), engine), kind),
    (progress) => saveReport(output, progress), engine, basis)
  for (const code of codes) {
    if (report.countries[code]) process.stdout.write(`${code} ${JSON.stringify(report.countries[code].counts)}\n`)
    else if (report.failures[code]) process.stdout.write(`${code} FAILED ${report.failures[code]}\n`)
    else process.stdout.write(`${code} PENDING\n`)
  }
  if (codes.some((code) => !report.countries[code])) process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
}
