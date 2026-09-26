import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { createReviewApp } from '../../src/review/server.js'
import { PortraitReviewStore, type ReviewItem } from '../../src/review/store.js'

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
      'x-portrait-collection': 'oceania-pacific-islands',
    }, payload: bytes })
    expect(upload.statusCode).toBe(201)
    const item = upload.json()
    expect(item.status).toBe('needs-metadata')
    expect(item.collection).toBe('oceania-pacific-islands')
    const reassigned = await app.inject({ method: 'POST', url: '/api/collections',
      payload: { ids: [item.id], collection: 'oceania-australia-new-zealand' } })
    expect(reassigned.json()[0].collection).toBe('oceania-australia-new-zealand')
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

  it('can decide the entire ready gallery when it contains more than 100 portraits', async () => {
    const root = await mkdtemp(join(tmpdir(), 'persona-review-all-'))
    roots.push(root)
    const items: ReviewItem[] = Array.from({ length: 101 }, (_, index) => {
      const id = `p_${String(index + 1).padStart(4, '0')}`
      const sha256 = (index + 1).toString(16).padStart(64, '0')
      return {
        id, originalName: `${id}.webp`, sourceSha256: sha256,
        sourceExtension: '.webp', status: 'ready-for-review', createdAt: '2026-09-26T00:00:00.000Z',
        technical: { format: 'webp', width: 512, height: 512, pages: 1, bytes: 25_000,
          sha256 },
        metadata: { ageGroup: 'adult', apparentAgeMin: 28, apparentAgeMax: 32,
          gender: 'female', appearance: 'west-african', visualGroup: 'black',
          rights: 'Synthetic portrait for Persona', rightsEvidence: 'Generation record retained locally' },
      }
    })
    await writeFile(join(root, 'review-state.json'), JSON.stringify(items))
    const store = new PortraitReviewStore(root)
    const decided = await store.decideMany(items.map((item) => item.id), {
      decision: 'approved', reviewer: 'Osiris Balonga', reason: 'Reviewed portraits',
    })
    expect(decided).toHaveLength(101)
    expect((await store.list()).every((item) => item.status === 'approved')).toBe(true)
  })

  it('lets a reviewer correct an approved portrait and undo a decision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'persona-review-correction-'))
    roots.push(root)
    const app = createReviewApp(root)
    const bytes = await sharp({ create: { width: 768, height: 768, channels: 3,
      background: '#aa806a' } }).png().toBuffer()
    const upload = await app.inject({ method: 'POST', url: '/api/upload', headers: {
      'content-type': 'application/octet-stream', 'x-file-name': 'portrait.png',
      origin: 'http://localhost:4317',
    }, payload: bytes })
    const id = upload.json().id as string
    const metadata = { ageGroup: 'adult', apparentAgeMin: 28, apparentAgeMax: 32,
      gender: 'female', appearance: 'west-african', visualGroup: 'black',
      rights: 'Synthetic portrait for Persona', rightsEvidence: 'Generation record retained locally' }
    expect((await app.inject({ method: 'POST', url: `/api/items/${id}/metadata`, payload: metadata })).statusCode).toBe(200)
    const approval = { decision: 'approved', reviewer: 'Osiris Balonga', reason: 'Reviewed portrait' }
    expect((await app.inject({ method: 'POST', url: `/api/items/${id}/decision`, payload: approval })).statusCode).toBe(200)

    const correction = await app.inject({ method: 'POST', url: `/api/items/${id}/metadata`,
      payload: { ...metadata, apparentAgeMin: 33, apparentAgeMax: 37,
        apparentAgeRanges: [[33, 37], [38, 42], [43, 47]] } })
    expect(correction.statusCode).toBe(200)
    expect(correction.json()).toMatchObject({ status: 'ready-for-review',
      metadata: { apparentAgeMin: 33, apparentAgeMax: 37,
        apparentAgeRanges: [[33, 37], [38, 42], [43, 47]] } })
    expect(correction.json().decision).toBeUndefined()

    expect((await app.inject({ method: 'POST', url: `/api/items/${id}/decision`, payload: approval })).statusCode).toBe(200)
    const reopened = await app.inject({ method: 'POST', url: `/api/items/${id}/reopen` })
    expect(reopened.statusCode).toBe(200)
    expect(reopened.json()).toMatchObject({ status: 'ready-for-review', metadata: { apparentAgeMin: 33 } })
    expect(reopened.json().decision).toBeUndefined()
    expect((await app.inject({ method: 'POST', url: `/api/items/${id}/reopen` })).statusCode).toBe(400)
    expect((await app.inject({ method: 'POST', url: `/api/items/${id}/decision`, payload: {
      decision: 'rejected', reviewer: 'Osiris Balonga', reason: 'Visible rendering artifact',
    } })).statusCode).toBe(200)
    expect((await app.inject({ method: 'POST', url: `/api/items/${id}/reopen` })).json().status)
      .toBe('ready-for-review')
    await app.close()
  })
})
