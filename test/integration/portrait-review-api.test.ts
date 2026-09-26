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

  it('applies a bulk decision only when every selected portrait is ready', async () => {
    const root = await mkdtemp(join(tmpdir(), 'persona-review-bulk-'))
    roots.push(root)
    const app = createReviewApp(root)
    const ids: string[] = []
    for (const color of ['#aa806a', '#806a55', '#735c4c']) {
      const bytes = await sharp({ create: { width: 768, height: 768, channels: 3, background: color } }).png().toBuffer()
      const response = await app.inject({ method: 'POST', url: '/api/upload', headers: {
        'content-type': 'application/octet-stream', 'x-file-name': `portrait-${ids.length + 1}.png`,
        origin: 'http://localhost:4317',
      }, payload: bytes })
      ids.push(response.json().id)
    }
    for (const id of ids.slice(0, 2)) {
      const response = await app.inject({ method: 'POST', url: `/api/items/${id}/metadata`, payload: {
        ageGroup: 'adult', apparentAgeMin: 28, apparentAgeMax: 32, gender: 'female',
        appearance: 'west-african', visualGroup: 'black', rights: 'Synthetic portrait for Persona',
        rightsEvidence: 'ChatGPT generation record retained locally',
      } })
      expect(response.statusCode).toBe(200)
    }
    const decision = { decision: 'approved', reviewer: 'Osiris Balonga', reason: 'Reviewed portraits' }
    const invalid = await app.inject({ method: 'POST', url: '/api/decisions', payload: { ids, ...decision } })
    expect(invalid.statusCode).toBe(400)
    expect((await app.inject({ method: 'GET', url: '/api/items' })).json().map((item: { status: string }) => item.status))
      .toEqual(['ready-for-review', 'ready-for-review', 'needs-metadata'])
    const approved = await app.inject({ method: 'POST', url: '/api/decisions', payload: { ids: ids.slice(0, 2), ...decision } })
    expect(approved.statusCode).toBe(200)
    expect(approved.json().map((item: { status: string }) => item.status)).toEqual(['approved', 'approved'])
    const repeated = await app.inject({ method: 'POST', url: '/api/decisions', payload: { ids: ids.slice(0, 2), ...decision } })
    expect(repeated.statusCode).toBe(400)
    await app.close()
  })
})
