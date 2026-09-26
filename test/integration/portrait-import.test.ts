import { describe, expect, it } from 'vitest'
import { preparePortraitImport, type PortraitReview } from '../../src/portraits/import.js'

// A one-pixel non-portrait WebP fixture. It must be rejected for portrait dimensions.
const tinyWebp = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64')
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l6sAAAAASUVORK5CYII=', 'base64')
const sha256 = 'a'.repeat(64)
const record = (id: string, overrides: Partial<PortraitReview> = {}): PortraitReview => ({
  id, objectKey: `portraits/v1/adult/female/black/west-african/${id}.webp`,
  apparentAgeRanges: [[28, 32]],
  catalogVersion: 'v1', ageGroup: 'adult', gender: 'female', visualGroup: 'black',
  appearance: 'west-african', rights: 'project-owned synthetic image',
  rightsEvidence: 'batch-review-1', sha256, reviewStatus: 'approved',
  reviewer: 'reviewer-1', reviewedAt: '2026-09-25', decisionReason: 'Reviewed',
  ...overrides,
})

describe('portrait import batch', () => {
  it('never publishes rejected or withdrawn IDs and rejects duplicate hashes', async () => {
    const rejected = record('p_0002', { reviewStatus: 'rejected', decisionReason: 'Poor quality' })
    const withdrawn = record('p_0003', { reviewStatus: 'withdrawn', decisionReason: 'Rights withdrawn' })
    const result = await preparePortraitImport([record('p_0001'), rejected, withdrawn],
      async () => tinyWebp, 'https://images.example.test')
    expect(result.approved).toEqual([])
    expect(result.errors).toContain('p_0001: dimensions must be 512x512')
    expect(result.errors).toContain('p_0001: SHA-256 does not match')
    expect(result.errors).not.toContain('p_0002: dimensions must be 512x512')
    expect(result.errors).not.toContain('p_0003: dimensions must be 512x512')
  })

  it('rejects duplicate approved hashes before any catalog proposal is usable', async () => {
    const result = await preparePortraitImport([record('p_0001'), record('p_0004')],
      async () => tinyWebp, 'https://images.example.test')
    expect(result.approved).toEqual([])
    expect(result.errors).toContain('p_0004: duplicate SHA-256')
  })

  it('detects a PNG even when its filename uses a WebP extension', async () => {
    const result = await preparePortraitImport([record('p_0001')], async () => tinyPng, 'https://images.example.test')
    expect(result.approved).toEqual([])
    expect(result.errors).toContain('p_0001: file is not WebP')
  })
})
