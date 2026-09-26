import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { createReviewApp } from '../../src/review/server.js'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('local portrait review API', () => {
  it('accepts an upload and serves a checked candidate without publishing it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'persona-review-api-'))
    roots.push(root)
    const app = createReviewApp(root)
    const bytes = await sharp({ create: { width: 768, height: 768, channels: 3,
      background: '#aa806a' } }).png().toBuffer()
    const upload = await app.inject({ method: 'POST', url: '/api/upload', headers: {
      'content-type': 'application/octet-stream', 'x-file-name': 'portrait.png', origin: 'http://localhost:4317',
    }, payload: bytes })
    expect(upload.statusCode).toBe(201)
    const item = upload.json()
    expect(item.status).toBe('needs-metadata')
    const listing = await app.inject({ method: 'GET', url: '/api/items' })
    expect(listing.json()).toHaveLength(1)
    const image = await app.inject({ method: 'GET', url: `/api/items/${item.id}/image` })
    expect(image.statusCode).toBe(200)
    expect(image.headers['content-type']).toContain('image/webp')
    expect(image.rawPayload.length).toBeLessThan(50_000)
    const denied = await app.inject({ method: 'POST', url: `/api/items/${item.id}/decision`,
      headers: { origin: 'https://other.example' }, payload: { decision: 'approved', reviewer: 'Osiris', reason: 'Checked' } })
    expect(denied.statusCode).toBe(403)
    await app.close()
  })
})
