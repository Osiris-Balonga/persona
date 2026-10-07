import { contextIntersectsRange, isPortraitContext, portraitContextIds, portraitContexts, type PortraitContext } from '../portraits/contexts.js'
import { portraitAgeRanges } from './age-ranges.js'
import { portraitCollectionOptions, type PortraitCollection } from './collections.js'
import { reviewedPortraitRecords } from './export.js'
import type { ReviewItem } from './store.js'

export interface PortraitCoverageAgeBand {
  minimumAge: number
  maximumAge: number
  approved: number
}

export interface PortraitCoverageRow {
  collection: PortraitCollection | 'unassigned'
  portraitContext: PortraitContext
  gender: 'female' | 'male'
  ageBands: PortraitCoverageAgeBand[]
}

function eligibleAgeBands(context: PortraitContext): PortraitCoverageAgeBand[] {
  const { minimumAge, maximumAge } = portraitContexts[context]
  return Object.values(portraitAgeRanges).flat().flatMap(([first, last]) => {
    if (!contextIntersectsRange(context, first, last)) return []
    return [{ minimumAge: Math.max(first, minimumAge), maximumAge: Math.min(last, maximumAge), approved: 0 }]
  })
}

export function portraitReviewCoverage(items: readonly ReviewItem[]): PortraitCoverageRow[] {
  const collections: Array<PortraitCollection | 'unassigned'> = ['unassigned', ...portraitCollectionOptions]
  const rows = new Map<string, PortraitCoverageRow>()
  for (const collection of collections) {
    for (const portraitContext of portraitContextIds) {
      for (const gender of ['female', 'male'] as const) {
        const row = { collection, portraitContext, gender, ageBands: eligibleAgeBands(portraitContext) }
        rows.set(`${collection}:${portraitContext}:${gender}`, row)
      }
    }
  }

  // Approved export is the source of truth; candidates and rejected records never add coverage.
  for (const record of reviewedPortraitRecords(items, 'v1')) {
    const portraitContext = record.portraitContext === undefined ? 'standard' : record.portraitContext
    if (!isPortraitContext(portraitContext)) continue
    const row = rows.get(`${record.collection ?? 'unassigned'}:${portraitContext}:${record.gender}`)
    if (!row) continue
    for (const [reviewedMinimum, reviewedMaximum] of record.apparentAgeRanges) {
      const { minimumAge, maximumAge } = portraitContexts[portraitContext]
      const effectiveMinimum = Math.max(reviewedMinimum, minimumAge)
      const effectiveMaximum = Math.min(reviewedMaximum, maximumAge)
      if (effectiveMinimum > effectiveMaximum) continue
      for (const band of row.ageBands) {
        if (band.minimumAge <= effectiveMaximum && band.maximumAge >= effectiveMinimum) band.approved++
      }
    }
  }
  return [...rows.values()]
}
