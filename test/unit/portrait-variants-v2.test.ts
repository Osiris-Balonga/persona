import { describe, expect, it, vi } from 'vitest'
import { handlePortraitRequest } from '../../worker/portrait-worker.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'

const prefix = 'portraits/v1'
const legacy = `${prefix}/p_0001.webp`
const variants = {
  large: { objectKey: `${prefix}/large/p_0001.webp`, sha256: 'a'.repeat(64) },
  medium: { objectKey: `${prefix}/medium/p_0001.webp`, sha256: 'b'.repeat(64) },
  thumbnail: { objectKey: `${prefix}/thumbnail/p_0001.webp`, sha256: 'c'.repeat(64) },
}
const catalog = {
  version: 'v1', publicBaseUrl: 'https://images.example.test',
  assets: [{ id: 'p_0001', objectKey: legacy, catalogVersion: 'v1', ageGroup: 'adult',
    apparentAgeRanges: [[28, 32]], gender: 'female', visualGroup: 'european',
    appearance: 'european', collection: 'europe-west', rights: 'Reviewed synthetic portrait',
    sha256: variants.large.sha256, variants, reviewStatus: 'approved' }],
} as unknown as PortraitCatalog

describe('versioned portrait renditions', () => {
  it('serves three exact approved rendition paths and retains the original URL', async () => {
    const hashes = new Map([[legacy, variants.large.sha256],
      ...Object.values(variants).map((variant) => [variant.objectKey, variant.sha256] as const)])
    const store = {
      get: vi.fn(async (key: string) => ({ size: 64, httpEtag: '"reviewed"',
        customMetadata: { sha256: hashes.get(key) ?? '' }, body: new Response('image').body! })),
      head: vi.fn(async (key: string) => ({ size: 64, httpEtag: '"reviewed"',
        customMetadata: { sha256: hashes.get(key) ?? '' } })),
    }
    for (const key of [legacy, ...Object.values(variants).map((variant) => variant.objectKey)]) {
      const url = `https://images.example.test/${key}`
      expect((await handlePortraitRequest(new Request(url), store, catalog)).status, key).toBe(200)
      expect((await handlePortraitRequest(new Request(url, { method: 'HEAD' }), store, catalog)).status, key).toBe(200)
    }
    const unknown = await handlePortraitRequest(new Request(`https://images.example.test/${prefix}/tiny/p_0001.webp`), store, catalog)
    expect(unknown.status).toBe(404)
    expect(store.get).not.toHaveBeenCalledWith(`${prefix}/tiny/p_0001.webp`)
  })

  it('rejects a rendition whose R2 checksum differs from its approved manifest record', async () => {
    const store = { get: vi.fn(async () => ({ size: 64, httpEtag: '"changed"',
      customMetadata: { sha256: 'f'.repeat(64) }, body: new Response('image').body! })),
    head: vi.fn(async () => null) }
    const response = await handlePortraitRequest(new Request(`https://images.example.test/${variants.medium.objectKey}`), store, catalog)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
