import { describe, expect, it, vi } from 'vitest'
import { handlePortraitRequest } from '../../worker/portrait-worker.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'

const key = 'portraits/v1/adult/female/black/west-african/p_0001.webp'
const hash = 'a'.repeat(64)
const catalog: PortraitCatalog = {
  version: 'v1', publicBaseUrl: 'https://images.example.test',
  assets: [{ id: 'p_0001', objectKey: key, catalogVersion: 'v1', ageGroup: 'adult', gender: 'female',
    apparentAgeRanges: [[28, 32]],
    visualGroup: 'black', appearance: 'west-african', rights: 'project-owned synthetic image',
    sha256: hash, reviewStatus: 'approved' },
  { id: 'p_0002', objectKey: 'portraits/v1/adult/female/black/west-african/p_0002.webp',
    apparentAgeRanges: [[28, 32]],
    catalogVersion: 'v1', ageGroup: 'adult', gender: 'female', visualGroup: 'black',
    appearance: 'west-african', rights: 'withdrawn', sha256: 'b'.repeat(64), reviewStatus: 'withdrawn' }],
}

const object = () => ({ size: 13, httpEtag: '"r2-etag"', customMetadata: { sha256: hash },
  body: new Response('fixture-bytes').body! })

describe('portrait delivery Worker', () => {
  it('uses weak comparison for GET and HEAD, including opaque tags containing commas', async () => {
    const store = { get: vi.fn(async () => ({ ...object(), httpEtag: '"r2,etag"' })),
      head: vi.fn(async () => ({ ...object(), httpEtag: '"r2,etag"' })) }
    for (const method of ['GET', 'HEAD']) {
      for (const validator of ['W/"r2,etag"', '"other", W/"r2,etag"', '*']) {
        const response = await handlePortraitRequest(new Request(`https://images.example.test/${key}`,
          { method, headers: { 'if-none-match': validator } }), store, catalog)
        expect(response.status).toBe(304)
        expect(response.body).toBeNull()
        expect(response.headers.get('etag')).toBe('"r2,etag"')
        expect(response.headers.get('content-length')).toBeNull()
      }
    }
    for (const validator of ['W/"other"', '*, "other"', '"r2,etag" trailing']) {
      const response = await handlePortraitRequest(new Request(`https://images.example.test/${key}`,
        { headers: { 'if-none-match': validator } }), store, catalog)
      expect(response.status).toBe(200)
    }
  })

  it('checks approval and stored hashes before wildcard cache revalidation', async () => {
    const store = { get: vi.fn(async () => ({ ...object(), customMetadata: { sha256: 'c'.repeat(64) } })),
      head: vi.fn(async () => null) }
    for (const path of [key, catalog.assets[1]!.objectKey]) {
      const response = await handlePortraitRequest(new Request(`https://images.example.test/${path}`,
        { headers: { 'if-none-match': '*' } }), store, catalog)
      expect(response.status).toBe(404)
    }
  })

  it('denies every object while the production catalog is empty', async () => {
    const store = { get: vi.fn(), head: vi.fn() }
    const emptyCatalog: PortraitCatalog = { version: 'empty-v1', publicBaseUrl: null, assets: [] }
    const response = await handlePortraitRequest(new Request(`https://images.example.test/${key}`), store, emptyCatalog)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(store.get).not.toHaveBeenCalled()
  })

  it('streams only an approved exact key and serves HEAD without a body', async () => {
    const store = { get: vi.fn(async () => object()), head: vi.fn(async () => object()) }
    const url = `https://images.example.test/${key}`
    const get = await handlePortraitRequest(new Request(url), store, catalog)
    expect(get.status).toBe(200)
    expect(await get.text()).toBe('fixture-bytes')
    expect(get.headers.get('content-type')).toBe('image/webp')
    expect(get.headers.get('cache-control')).toBe('public, max-age=300, must-revalidate')
    expect(get.headers.get('etag')).toBe('"r2-etag"')
    expect(get.headers.get('x-content-type-options')).toBe('nosniff')
    const head = await handlePortraitRequest(new Request(url, { method: 'HEAD' }), store, catalog)
    expect(head.status).toBe(200)
    expect(head.body).toBeNull()
    expect(store.get).toHaveBeenCalledOnce()
    expect(store.head).toHaveBeenCalledOnce()
  })

  it('denies withdrawn, unknown, query-suffixed, missing and hash-mismatched objects', async () => {
    const store = { get: vi.fn(async () => null), head: vi.fn(async () => null) }
    for (const url of [
      'https://images.example.test/portraits/v1/adult/female/black/west-african/p_0002.webp',
      'https://images.example.test/portraits/v1/adult/female/black/west-african/p_9999.webp',
      `https://images.example.test/${key}?variant=1`,
    ]) {
      const response = await handlePortraitRequest(new Request(url), store, catalog)
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
    expect(store.get).not.toHaveBeenCalled()
    expect((await handlePortraitRequest(new Request(`https://images.example.test/${key}`), store, catalog)).status).toBe(404)
    store.get.mockImplementation(async () => ({ ...object(), customMetadata: { sha256: 'c'.repeat(64) } }))
    expect((await handlePortraitRequest(new Request(`https://images.example.test/${key}`), store, catalog)).status).toBe(404)
  })

  it('rejects writes and revalidates a matching ETag', async () => {
    const store = { get: vi.fn(async () => object()), head: vi.fn(async () => object()) }
    const url = `https://images.example.test/${key}`
    const denied = await handlePortraitRequest(new Request(url, { method: 'PUT' }), store, catalog)
    expect(denied.status).toBe(405)
    expect(denied.headers.get('allow')).toBe('GET, HEAD')
    const cached = await handlePortraitRequest(new Request(url, { headers: { 'if-none-match': '"r2-etag"' } }), store, catalog)
    expect(cached.status).toBe(304)
    expect(cached.body).toBeNull()
  })
})
