import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { handlePortraitUpload } from '../../worker/portrait-upload.js'

const bytes = new TextEncoder().encode('reviewed portrait fixture')
const sha256 = createHash('sha256').update(bytes).digest('hex')
const key = 'portraits/v1/p_0042.webp'

function request(hash = sha256, path = key) {
  return new Request(`http://127.0.0.1:8788/${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'image/webp', 'X-Portrait-Sha256': hash }, body: bytes,
  })
}

describe('local portrait uploader', () => {
  it('uploads a verified object with SHA-256 metadata and is idempotent', async () => {
    const head = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
      size: bytes.length, customMetadata: { sha256 },
    })
    const put = vi.fn(async () => ({ size: bytes.length, customMetadata: { sha256 } }))
    const store = { head, put }
    expect((await handlePortraitUpload(request(), store)).status).toBe(201)
    expect(put).toHaveBeenCalledWith(key, expect.any(Uint8Array), {
      httpMetadata: { contentType: 'image/webp' }, customMetadata: { sha256 }, sha256,
    })
    expect((await handlePortraitUpload(request(), store)).status).toBe(200)
    expect(put).toHaveBeenCalledOnce()
  })

  it('refuses a changed object, invalid hash and non-loopback access', async () => {
    const store = { head: vi.fn(async () => ({ size: bytes.length, customMetadata: { sha256: 'a'.repeat(64) } })),
      put: vi.fn() }
    expect((await handlePortraitUpload(request(), store)).status).toBe(409)
    expect((await handlePortraitUpload(request('b'.repeat(64)), store)).status).toBe(422)
    const remote = new Request(`https://persona-portraits.example.workers.dev/${key}`, {
      method: 'PUT', headers: { 'X-Portrait-Sha256': sha256 }, body: bytes,
    })
    expect((await handlePortraitUpload(remote, store)).status).toBe(403)
    expect(store.put).not.toHaveBeenCalled()
  })
})
