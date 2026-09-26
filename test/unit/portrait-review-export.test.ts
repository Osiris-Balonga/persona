import { describe, expect, it } from 'vitest'
import { reviewedPortraitRecords } from '../../src/review/export.js'
import type { ReviewItem } from '../../src/review/store.js'

const approved: ReviewItem = {
  id: 'p_0049', originalName: 'sahel-adult-female-01.png', sourceSha256: 'b'.repeat(64),
  sourceExtension: '.png', status: 'approved', createdAt: '2026-09-26T09:06:07.859Z',
  collection: 'africa-west',
  technical: { format: 'webp', width: 512, height: 512, pages: 1, bytes: 21_300, sha256: 'a'.repeat(64) },
  metadata: { ageGroup: 'adult', apparentAgeMin: 23, apparentAgeMax: 27,
    apparentAgeRanges: [[23, 27], [28, 32], [33, 37]], gender: 'female',
    appearance: 'west-african', visualGroup: 'black', appearanceTags: ['black'], skinToneMst: 7,
    rights: 'Synthetic portrait generated for Persona',
    rightsEvidence: 'Codex image_gen batch africa-pilot-2026-09-25; source master retained locally as p_0049.png' },
  decision: { decision: 'approved', reviewer: 'Osiris Balonga', reason: 'Conforme après inspection visuelle',
    at: '2026-09-26T14:27:29.217Z' },
}

describe('reviewed portrait export', () => {
  it('maps approved local metadata to a stable R2 import record', () => {
    expect(reviewedPortraitRecords([approved], 'v1')).toEqual([expect.objectContaining({
      id: 'p_0049', objectKey: 'portraits/v1/p_0049.webp', catalogVersion: 'v1',
      apparentAgeRanges: [[23, 27], [28, 32], [33, 37]], appearanceTags: ['black'],
      sha256: 'a'.repeat(64), reviewStatus: 'approved', reviewer: 'Osiris Balonga',
      reviewedAt: '2026-09-26', decisionReason: 'Conforme après inspection visuelle',
    })])
    expect(reviewedPortraitRecords([{ ...approved, status: 'rejected' }], 'v1')).toEqual([])
  })

  it('stops export when an approved portrait lacks reviewed metadata', () => {
    expect(() => reviewedPortraitRecords([{ ...approved, metadata: undefined }], 'v1'))
      .toThrow('p_0049')
  })
})
