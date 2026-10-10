import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { handlePortraitUpload } from '../../worker/portrait-upload.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'

const bytes = new TextEncoder().encode('fixture rendition bytes')
const hash = createHash('sha256').update(bytes).digest('hex')
const key = 'portraits/v1/medium/p_0001.webp'
const catalog: PortraitCatalog = {
  version: 'v1', publicBaseUrl: 'https://images.example.test',
  assets: [{ id: 'p_0001', objectKey: 'portraits/v1/p_0001.webp', catalogVersion: 'v1',
    ageGroup: 'adult', apparentAgeRanges: [[28, 32]], gender: 'female', visualGroup: 'european',
    appearance: 'european', rights: 'Reviewed synthetic portrait', sha256: 'a'.repeat(64),
    variants: {
      large: { objectKey: 'portraits/v1/large/p_0001.webp', sha256: 'a'.repeat(64) },
      medium: { objectKey: key, sha256: hash },
      thumbnail: { objectKey: 'portraits/v1/thumbnail/p_0001.webp', sha256: 'b'.repeat(64) },
    }, reviewStatus: 'approved' }],
}

function request(path: string) {
  return new Request(`http://127.0.0.1:8788/${path}`, { method: 'PUT',
    headers: { 'Content-Type': 'image/webp', 'X-Portrait-Sha256': hash }, body: bytes })
}

describe('local variant publisher', () => {
  it('accepts only exact approved manifest keys and hashes', async () => {
    const store = { head: vi.fn(async () => null), put: vi.fn(async () => ({
      size: bytes.length, customMetadata: { sha256: hash },
    })) }
    expect((await handlePortraitUpload(request(key), store, catalog)).status).toBe(201)
    expect((await handlePortraitUpload(request('portraits/v1/medium/p_9999.webp'), store, catalog)).status).toBe(403)
    expect((await handlePortraitUpload(request('portraits/v1/tiny/p_0001.webp'), store, catalog)).status).toBe(400)
    const withdrawn = { ...catalog, assets: [{ ...catalog.assets[0], reviewStatus: 'withdrawn' as const }] }
    expect((await handlePortraitUpload(request(key), store, withdrawn)).status).toBe(403)
    expect(store.put).toHaveBeenCalledOnce()
  })
})
