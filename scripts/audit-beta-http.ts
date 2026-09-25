import { auditBetaHttp } from '../src/beta-audit.js'

const report = await auditBetaHttp()
console.log(JSON.stringify(report, null, 2))
if (report.errors.length) process.exitCode = 1
