import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { preparePortraitRenditions, renditionNames, renditionPixels, sha256, verifyRendition } from '../../src/portraits/variants.js'
import { validatePortraitCatalog, type PortraitAsset } from '../../src/portraits/catalog.js'

async function fixture() {
  const original = await sharp({ create: { width: 512, height: 512, channels: 3,
    background: { r: 80, g: 100, b: 120 } } }).webp().toBuffer()
  const asset = { id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
    ageGroup: 'adult', apparentAgeRanges: [[28, 32]], gender: 'female', visualGroup: 'european',
    appearance: 'european', rights: 'Reviewed synthetic portrait', sha256: sha256(original),
    reviewStatus: 'approved' } as PortraitAsset
  return { original, asset }
}

describe('portrait rendition preparation', () => {
  it('copies the reviewed 512px bytes and makes valid 256px and 64px WebP renditions', async () => {
    const { original, asset } = await fixture()
    const { variants, bytes } = await preparePortraitRenditions(original, asset, 'v1')
    expect(bytes.large.equals(original)).toBe(true)
    expect(variants.large.sha256).toBe(asset.sha256)
    for (const size of renditionNames) {
      expect(variants[size].objectKey).toBe(`portraits/v1/${size}/p_0001.webp`)
      await expect(verifyRendition(bytes[size], renditionPixels[size], variants[size].sha256)).resolves.toBeUndefined()
    }
    expect(validatePortraitCatalog({ version: 'v1', publicBaseUrl: 'https://images.example.test',
      assets: [{ ...asset, variants }] })).toEqual([])
  })

  it('refuses a changed original and a damaged prepared variant', async () => {
    const { original, asset } = await fixture()
    await expect(preparePortraitRenditions(original, { ...asset, sha256: 'a'.repeat(64) }, 'v1'))
      .rejects.toThrow('does not match catalog')
    const { variants, bytes } = await preparePortraitRenditions(original, asset, 'v1')
    await expect(verifyRendition(bytes.medium, 256, variants.thumbnail.sha256)).rejects.toThrow('SHA-256')
    expect(validatePortraitCatalog({ version: 'v1', publicBaseUrl: 'https://images.example.test',
      assets: [{ ...asset, variants: { ...variants, large: { ...variants.large, sha256: 'b'.repeat(64) } } }] }))
      .toContain('Large portrait variant must match original p_0001')
  })
})
