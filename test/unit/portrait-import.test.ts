import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { evaluatePortraitImport, validatePortraitReview, type PortraitReview } from '../../src/portraits/import.js'

const hash = 'a'.repeat(64)
const review = (overrides: Partial<PortraitReview> = {}): PortraitReview => ({
  id: 'p_0001', catalogVersion: 'v1', ageGroup: 'adult', gender: 'female',
  visualGroup: 'black', appearance: 'west-african',
  objectKey: 'portraits/v1/adult/female/black/west-african/p_0001.webp',
  rights: 'project-owned synthetic image', rightsEvidence: 'review-record-0001',
  sha256: hash, reviewStatus: 'approved', reviewer: 'reviewer-1',
  reviewedAt: '2026-09-25', decisionReason: 'Meets the portrait rubric', ...overrides,
})

describe('portrait import review', () => {
  it('accepts complete approval evidence and a square 512px WebP below 50,000 bytes', () => {
    expect(validatePortraitReview(review(), { format: 'webp', width: 512, height: 512, pages: 1, bytes: 49_999, sha256: hash })).toEqual([])
  })

  it('rejects oversized, misdimensioned, animated, mislabeled and altered assets', () => {
    const valid = { format: 'webp', width: 512, height: 512, pages: 1, bytes: 49_999, sha256: hash }
    expect(validatePortraitReview(review(), { ...valid, bytes: 50_000 })).toContain('p_0001: file must be below 50,000 bytes')
    expect(validatePortraitReview(review(), { ...valid, width: 400 })).toContain('p_0001: dimensions must be 512x512')
    expect(validatePortraitReview(review(), { ...valid, pages: 2 })).toContain('p_0001: animated images are not allowed')
    expect(validatePortraitReview(review(), { ...valid, format: 'png' })).toContain('p_0001: file is not WebP')
    expect(validatePortraitReview(review(), { ...valid, sha256: createHash('sha256').update('altered').digest('hex') }))
      .toContain('p_0001: SHA-256 does not match')
  })

  it('requires named decisions, rights evidence, and consistent catalog metadata', () => {
    const file = { format: 'webp', width: 512, height: 512, pages: 1, bytes: 1_000, sha256: hash }
    expect(validatePortraitReview(review({ reviewer: '', rightsEvidence: '', decisionReason: '' }), file).length).toBeGreaterThanOrEqual(3)
    expect(validatePortraitReview(review({ reviewedAt: '2026-02-30' }), file)).toContain('p_0001: review date is required')
    expect(validatePortraitReview(review({ ageGroup: 'teen', reviewStatus: 'withdrawn' }), file))
      .toContain('p_0001: inconsistent catalog metadata')
  })

  it('proposes only explicitly approved records from a fully valid reviewed batch', () => {
    const approved = review()
    const rejected = review({ id: 'p_0002', objectKey: 'portraits/v1/adult/female/black/west-african/p_0002.webp',
      reviewStatus: 'rejected', decisionReason: 'Visible artifact', sha256: 'b'.repeat(64) })
    const withdrawn = review({ id: 'p_0003', objectKey: 'portraits/v1/adult/female/black/west-african/p_0003.webp',
      reviewStatus: 'withdrawn', decisionReason: 'Rights withdrawn', sha256: 'c'.repeat(64) })
    const files = new Map([['p_0001', { format: 'webp', width: 512, height: 512, pages: 1, bytes: 40_000, sha256: hash }]])
    const result = evaluatePortraitImport([approved, rejected, withdrawn], files, 'https://images.example.test')
    expect(result.errors).toEqual([])
    expect(result.approved.map((asset) => asset.id)).toEqual(['p_0001'])
    expect(result.approved[0]).not.toHaveProperty('reviewer')
  })
})
