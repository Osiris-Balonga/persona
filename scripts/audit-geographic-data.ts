import { auditGeographicData } from '../src/geography/audit.js'

const report = auditGeographicData()
const summary = {
  dataVersion: report.dataVersion,
  registryCodes: report.registryCodes,
  eligibleCodes: report.eligibleCodes,
  unavailableCodes: report.unavailableCodes,
  sampledCodes: report.sampledCodes,
  gapCodes: report.gaps.length,
  errors: report.errors,
}
console.log(JSON.stringify(process.argv.includes('--json') ? report : summary, null, 2))
if (report.errors.length) process.exitCode = 1
