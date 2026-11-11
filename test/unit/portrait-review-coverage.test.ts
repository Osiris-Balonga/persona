import { describe, expect, it } from 'vitest'
import { portraitReviewCoverage } from '../../src/review/coverage.js'
import type { PortraitContext } from '../../src/portraits/contexts.js'
import type { ReviewItem } from '../../src/review/store.js'

function reviewed(id: string, input: {
  collection?: ReviewItem['collection']
  context?: PortraitContext
  gender?: 'female' | 'male'
  ranges: readonly (readonly [number, number])[]
  status?: ReviewItem['status']
}): ReviewItem {
  const [first, last] = input.ranges[0]
  return {
    id, originalName: `${id}.webp`, sourceSha256: id.padStart(64, '0').slice(-64), sourceExtension: '.webp',
    status: input.status ?? 'approved', createdAt: '2026-10-07T00:00:00.000Z',
    ...(input.collection ? { collection: input.collection } : {}),
    technical: { format: 'webp', width: 512, height: 512, pages: 1, bytes: 20_000, sha256: id.padStart(64, 'a').slice(-64) },
    metadata: { ...(input.context ? { portraitContext: input.context } : {}),
      ageGroup: first <= 12 ? 'child' : first <= 17 ? 'teen' : first <= 64 ? 'adult' : 'senior',
      apparentAgeMin: first, apparentAgeMax: last, apparentAgeRanges: input.ranges,
      gender: input.gender ?? 'female', appearance: 'west-african', visualGroup: 'black',
      rights: 'Synthetic portrait for Persona', rightsEvidence: 'Retained generation record' },
    ...(input.status === 'ready-for-review' || input.status === 'approved' || input.status === undefined
      ? { decision: { decision: 'approved' as const, reviewer: 'Reviewer', reason: 'Inspected', at: '2026-10-07T00:00:00.000Z' } }
      : {}),
  }
}

describe('contextual portrait review coverage', () => {
  it('counts only approved records and treats a missing context as standard', () => {
    const rows = portraitReviewCoverage([
      reviewed('p_0001', { collection: 'africa-central', ranges: [[23, 27]] }),
      reviewed('p_0002', { collection: 'africa-central', context: 'doctor', ranges: [[23, 27]], status: 'ready-for-review' }),
    ])
    const standard = rows.find(row => row.collection === 'africa-central' && row.portraitContext === 'standard' && row.gender === 'female')!
    const doctor = rows.find(row => row.collection === 'africa-central' && row.portraitContext === 'doctor' && row.gender === 'female')!
    expect(standard.ageBands.find(band => band.minimumAge === 23)).toMatchObject({ minimumAge: 23, maximumAge: 27, approved: 1 })
    expect(doctor.ageBands.find(band => band.minimumAge === 25)).toMatchObject({ minimumAge: 25, maximumAge: 27, approved: 0 })
  })

  it('clips five-year reviewed bands to context eligibility and reports unsupported bands', () => {
    const rows = portraitReviewCoverage([
      reviewed('p_0003', { collection: 'africa-central', context: 'doctor', ranges: [[23, 27], [28, 32]] }),
    ])
    const doctor = rows.find(row => row.collection === 'africa-central' && row.portraitContext === 'doctor' && row.gender === 'female')!
    expect(doctor.ageBands[0]).toEqual({ minimumAge: 25, maximumAge: 27, approved: 1 })
    expect(doctor.ageBands[1]).toEqual({ minimumAge: 28, maximumAge: 32, approved: 1 })
    expect(doctor.ageBands.at(-1)).toEqual({ minimumAge: 63, maximumAge: 64, approved: 0 })
    expect(doctor.ageBands.every(band => band.minimumAge >= 25 && band.maximumAge <= 64)).toBe(true)
  })
})
