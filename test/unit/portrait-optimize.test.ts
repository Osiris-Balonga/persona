import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { inspectPortraitBytes } from '../../src/portraits/import.js'
import { optimizePortraitCandidate } from '../../src/portraits/optimize.js'

describe('portrait candidate optimization', () => {
  it('converts a square master into a decodable 512px WebP under the import limit', async () => {
    const master = await sharp({ create: { width: 1254, height: 1254, channels: 3, background: '#715244' } })
      .png().toBuffer()
    const optimized = await optimizePortraitCandidate(master)
    expect(await inspectPortraitBytes(optimized)).toMatchObject({
      format: 'webp', width: 512, height: 512, pages: 1, bytes: optimized.length,
    })
    expect(optimized.length).toBeLessThan(50_000)
  })

  it('rejects undersized or non-square masters rather than enlarging or cropping a face', async () => {
    for (const [width, height] of [[400, 400], [1254, 1000]]) {
      const master = await sharp({ create: { width, height, channels: 3, background: '#715244' } })
        .png().toBuffer()
      await expect(optimizePortraitCandidate(master)).rejects.toThrow('square and at least 512px')
    }
  })
})
