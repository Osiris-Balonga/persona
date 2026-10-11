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

  it('reduces quality only as needed for a detailed portrait that exceeds 50 KB at the preferred quality', async () => {
    const width = 512
    const pixels = Buffer.alloc(width * width * 3)
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
      const base = Math.round(100 + 50 * Math.sin(x / 50) + 40 * Math.cos(y / 60))
      const shade = Math.max(0, Math.min(255, base + (((x * 37 + y * 71) % 31) - 15) * 10 / 15))
      const index = (y * width + x) * 3
      pixels[index] = shade
      pixels[index + 1] = shade * 0.9
      pixels[index + 2] = shade * 0.8
    }
    const master = await sharp(pixels, { raw: { width, height: width, channels: 3 } }).png().toBuffer()
    const preferred = await sharp(master).resize(width, width).webp({ quality: 88, effort: 6 })
      .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"/>').toBuffer()
    expect(preferred.length).toBeGreaterThanOrEqual(50_000)
    const optimized = await optimizePortraitCandidate(master, '<x:xmpmeta xmlns:x="adobe:ns:meta/"/>')
    expect(optimized.length).toBeLessThan(50_000)
    expect(await inspectPortraitBytes(optimized)).toMatchObject({ format: 'webp', width, height: width, pages: 1 })
  })
})
