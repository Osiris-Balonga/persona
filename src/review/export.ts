import type { PortraitReview } from '../portraits/import.js'
import type { ReviewItem } from './store.js'
import { contextIntersectsRange, isPortraitContext } from '../portraits/contexts.js'

export function reviewedPortraitRecords(items: readonly ReviewItem[], version: string): PortraitReview[] {
  if (!/^[a-z][a-z0-9-]*$/.test(version)) throw new RangeError('Invalid catalog version')
  return items.filter((item) => item.status === 'approved').map((item) => {
    const { metadata, technical, decision } = item
    if (!metadata || !technical || decision?.decision !== 'approved') {
      throw new RangeError(`${item.id}: incomplete approved review`)
    }
    const ranges = metadata.apparentAgeRanges ?? [
      [metadata.apparentAgeMin, metadata.apparentAgeMax] as const,
      ...(metadata.secondaryAgeMin === undefined ? []
        : [[metadata.secondaryAgeMin, metadata.secondaryAgeMax as number] as const]),
    ]
    const portraitContext = metadata.portraitContext === undefined ? 'standard' : metadata.portraitContext
    if (!isPortraitContext(portraitContext)
      || !ranges.every(([minimum, maximum]) => contextIntersectsRange(portraitContext, minimum, maximum))) {
      throw new RangeError(`${item.id}: invalid portrait context or age eligibility`)
    }
    return {
      id: item.id, objectKey: `portraits/${version}/large/${item.id}.webp`, catalogVersion: version,
      ageGroup: metadata.ageGroup, apparentAgeRanges: ranges, gender: metadata.gender,
      portraitContext,
      visualGroup: metadata.visualGroup, appearance: metadata.appearance,
      ...(item.collection ? { collection: item.collection } : {}),
      appearanceTags: metadata.appearanceTags, skinToneMst: metadata.skinToneMst,
      rights: metadata.rights, sha256: technical.sha256, reviewStatus: 'approved',
      rightsEvidence: metadata.rightsEvidence, reviewer: decision.reviewer,
      reviewedAt: decision.at.slice(0, 10), decisionReason: decision.reason,
    }
  })
}
