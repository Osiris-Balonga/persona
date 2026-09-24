import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
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

export async function collectCandidates(codes, previous, fetchRows, save) {
  if (previous && (previous.schemaVersion !== 2
    || JSON.stringify(previous.requestedCodes) !== JSON.stringify(codes))) {
    throw new Error('Existing report has a different format or country list; choose another output path')
  }
  const report = previous ?? {
    schemaVersion: 2,
    source: endpoint,
    license: 'CC0-1.0',
    requestedCodes: codes,
    selection: 'P27 citizenship, P21 sex or gender, P735 given name, P734 family name; grouped counts',
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
        queries: { given: queryFor([code], 'given'), family: queryFor([code], 'family') },
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

async function saveReport(output, report) {
  await mkdir(dirname(output), { recursive: true })
  const temporary = `${output}.tmp`
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await rename(temporary, output)
}

async function main() {
  const { codes, output } = argumentsFrom(process.argv.slice(2))
  let previous = null
  try { previous = JSON.parse(await readFile(output, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const report = await collectCandidates(codes, previous,
    async (code, kind) => parseBindings(await fetchBindings(queryFor([code], kind)), kind),
    (progress) => saveReport(output, progress))
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
