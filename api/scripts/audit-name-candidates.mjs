import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function auditCandidateReport(report) {
  const rows = report.requestedCodes.map((code) => {
    const country = report.countries[code]
    if (!country) return { code, status: report.failures[code] ? 'failed' : 'pending',
      reason: report.failures[code] ?? null }

    const given = new Set([...country.female, ...country.male].map((entry) => entry.name))
    const family = new Set(country.family.map((entry) => entry.name))
    return {
      code,
      status: 'complete',
      source: country.source ?? report.source,
      retrievedAt: country.retrievedAt ?? report.retrievedAt,
      sourceRowsSha256: country.sourceRowsSha256 ?? country.sourceReportSha256 ?? null,
      counts: country.counts,
      rejectedLabels: country.rejectedLabels,
      ambiguousGivenNames: country.ambiguousGivenNames.length,
      givenFamilyOverlap: [...given].filter((name) => family.has(name)).length,
      formatAnomalies: [...country.female, ...country.male, ...country.family]
        .filter((entry) => /\b\p{Lu}{2,}\b/u.test(entry.name)).length,
    }
  })
  return {
    requestedCodes: rows.length,
    completedCodes: rows.filter((row) => row.status === 'complete').length,
    failedCodes: rows.filter((row) => row.status === 'failed').length,
    pendingCodes: rows.filter((row) => row.status === 'pending').length,
    broadCandidateCodes: rows.filter((row) => row.status === 'complete'
      && row.counts.female >= 50 && row.counts.male >= 50 && row.counts.family >= 50).length,
    rows,
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const input = resolve(process.argv[2] ?? 'data/geography/africa-name-candidates-2026-09-24.json')
  const report = JSON.parse(await readFile(input, 'utf8'))
  const audit = auditCandidateReport(report)
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`)
  if (audit.failedCodes || audit.pendingCodes) process.exitCode = 1
}
