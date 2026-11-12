import { describe, expect, it } from 'vitest'
import { createPublicCoverage } from '../../src/public-coverage.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'

describe('public coverage projection', () => {
  it('counts approved delivered assets and only their existing Monk tone annotations', () => {
    const sample = portraitCatalog.assets.slice(0, 2)
    const catalog = { ...portraitCatalog, assets: sample }
    const { body, etag } = createPublicCoverage(catalog)
    expect(createPublicCoverage(catalog).etag).toBe(etag)
    expect(body.portraits.total).toBe(2)
    expect(body.portraits.annotatedSkinTone).toBe(sample.filter((asset) => asset.skinToneMst !== undefined).length)
    expect(body.portraits.contexts.find((context) => context.id === 'standard')?.count)
      .toBe(sample.filter((asset) => (asset.portraitContext ?? 'standard') === 'standard').length)
    expect(body.portraits.skinTones.reduce((total, tone) => total + tone.count, 0)).toBe(body.portraits.annotatedSkinTone)

    const withoutVariants = { ...sample[0]!, variants: undefined }
    const withheld = createPublicCoverage({ ...catalog, assets: [withoutVariants] })
    expect(withheld.body.portraits.total).toBe(0)
    expect(withheld.body.portraits.annotatedSkinTone).toBe(0)
  })

  it('changes the validator when assets change under the same catalog version and reports no undeliverable portraits', () => {
    const first = { ...portraitCatalog, assets: portraitCatalog.assets.slice(0, 1) }
    const expanded = { ...first, assets: portraitCatalog.assets.slice(0, 2) }
    expect(expanded.version).toBe(first.version)
    expect(createPublicCoverage(expanded).etag).not.toBe(createPublicCoverage(first).etag)

    const unserved = createPublicCoverage({ ...expanded, publicBaseUrl: null })
    expect(unserved.body.portraits.total).toBe(0)
    expect(unserved.body.portraits.annotatedSkinTone).toBe(0)
  })
})
