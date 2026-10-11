import { portraitCoverageMatrix, validatePortraitCatalog } from '../src/portraits/catalog.js'
import { portraitCatalog } from '../src/portraits/manifest.js'

const errors = validatePortraitCatalog(portraitCatalog)
const rows = portraitCoverageMatrix(portraitCatalog)
const summary = {
  catalogVersion: portraitCatalog.version,
  combinations: rows.length,
  readyCombinations: rows.filter((row) => row.ready).length,
  approvedAssets: portraitCatalog.assets.filter((asset) => asset.reviewStatus === 'approved').length,
  minimumApprovedPerCombination: 2,
  errors,
}
console.log(JSON.stringify(process.argv.includes('--json') ? { ...summary, rows } : summary, null, 2))
if (errors.length) process.exitCode = 1
