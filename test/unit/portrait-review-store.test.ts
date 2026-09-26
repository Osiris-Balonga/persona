import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, readdir, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { PortraitReviewStore } from '../../src/review/store.js'

const roots: string[] = []
const createStore = async () => {
  const root = await mkdtemp(join(tmpdir(), 'persona-portrait-review-'))
  roots.push(root)
  return { root, store: new PortraitReviewStore(root) }
}
const squarePortrait = () => sharp({ create: { width: 768, height: 768, channels: 3,
  background: '#a8836e' } }).png().toBuffer()

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })

describe('portrait review storage', () => {
  it('assigns a production collection without claiming a visual origin or changing approval', async () => {
    const { store } = await createStore()
    const candidate = await store.ingest(await squarePortrait(), 'european-batch.png')
    expect((await store.assignCollection([candidate.id], 'europe-west'))[0]?.collection)
      .toBe('europe-west')
    await expect(store.assignCollection([candidate.id], 'north-american'))
      .rejects.toThrow('collection')
    expect((await store.get(candidate.id))?.status).toBe('needs-metadata')
  })
  it('moves a processed original out of inbox and records a checked WebP candidate', async () => {
    const { root, store } = await createStore()
    const bytes = await squarePortrait()
    const candidate = await store.ingest(bytes, 'manual-portrait.png')
    expect(candidate.status).toBe('needs-metadata')
    expect(candidate.technical).toMatchObject({ format: 'webp', width: 512, height: 512, pages: 1 })
    expect(candidate.technical?.bytes).toBeLessThan(50_000)
    expect(await readdir(join(root, 'inbox'))).toEqual([])
    expect(await readdir(join(root, 'masters'))).toEqual([`${candidate.id}.png`])
    expect(await readdir(join(root, 'webp'))).toEqual([`${candidate.id}.webp`])
    expect((await store.ingest(bytes, 'the-same-image-again.png')).id).toBe(candidate.id)
  })

  it('embeds proposed apparent age and category before review, then records a human decision', async () => {
    const { root, store } = await createStore()
    const candidate = await store.ingest(await squarePortrait(), 'adult-portrait.png')
    const prepared = await store.setMetadata(candidate.id, {
      ageGroup: 'adult', apparentAgeMin: 33, apparentAgeMax: 37,
      gender: 'female', appearance: 'west-african', visualGroup: 'west-african',
      rights: 'Synthetic portrait for Persona', rightsEvidence: 'ChatGPT generation record retained locally',
    })
    expect(prepared.status).toBe('ready-for-review')
    const webp = await readFile(join(root, 'webp', `${candidate.id}.webp`))
    const embedded = (await sharp(webp).metadata()).xmpAsString ?? ''
    expect(embedded).toContain('apparentAgeMin="33"')
    expect(embedded).toContain('apparentAgeMax="37"')
    expect(embedded).toContain('appearance="west-african"')
    expect(prepared.technical?.sha256).not.toBe(candidate.technical?.sha256)
    const approved = await store.decide(candidate.id, { decision: 'approved', reviewer: 'Osiris Balonga',
      reason: 'Age, appearance, quality and rights reviewed' })
    expect(approved.status).toBe('approved')
    expect((await store.list())[0]?.status).toBe('approved')
    expect(await readdir(join(root, 'webp'))).toEqual([`${candidate.id}.webp`])
  })

  it('embeds multiple consecutive bands and rejects a gap', async () => {
    const { root, store } = await createStore()
    const candidate = await store.ingest(await squarePortrait(), 'adult-portrait.png')
    const metadata = { ageGroup: 'adult' as const, apparentAgeMin: 28, apparentAgeMax: 32,
      apparentAgeRanges: [[28, 32], [33, 37], [38, 42]], gender: 'female' as const,
      appearance: 'west-african' as const, visualGroup: 'black',
      rights: 'Synthetic portrait for Persona', rightsEvidence: 'Generation record retained locally' }
    expect((await store.setMetadata(candidate.id, metadata)).status).toBe('ready-for-review')
    const embedded = (await sharp(await readFile(join(root, 'webp', `${candidate.id}.webp`))).metadata()).xmpAsString ?? ''
    expect(embedded).toContain('apparentAgeRanges="28-32,33-37,38-42"')
    await expect(store.setMetadata(candidate.id, { ...metadata, apparentAgeRanges: [[28, 32], [38, 42]] }))
      .rejects.toThrow('consecutive')
  })

  it('keeps failed uploads in inbox and rejected candidates out of the approved set', async () => {
    const { root, store } = await createStore()
    const rectangle = await sharp({ create: { width: 768, height: 600, channels: 3,
      background: '#a8836e' } }).png().toBuffer()
    const failed = await store.ingest(rectangle, 'rectangle.png')
    expect(failed.status).toBe('processing-error')
    expect(await readdir(join(root, 'inbox'))).toEqual([`${failed.id}.png`])
    const candidate = await store.ingest(await squarePortrait(), 'another-portrait.png')
    await expect(store.decide(candidate.id, { decision: 'approved', reviewer: 'Osiris Balonga',
      reason: 'Looks good' })).rejects.toThrow('Metadata')
    const rejected = await store.decide(candidate.id, { decision: 'rejected', reviewer: 'Osiris Balonga',
      reason: 'Visible rendering artifact' })
    expect(rejected.status).toBe('rejected')
    const reopened = await store.reopen(candidate.id)
    expect(reopened.status).toBe('needs-metadata')
    expect(reopened.decision).toBeUndefined()
    expect((await store.list()).filter((item) => item.status === 'approved')).toEqual([])
  })

  it('processes files placed directly in the inbox', async () => {
    const { root, store } = await createStore()
    await mkdir(join(root, 'inbox'), { recursive: true })
    await writeFile(join(root, 'inbox', 'portrait-from-chatgpt.png'), await squarePortrait())
    const [item] = await store.processInbox()
    expect(item?.status).toBe('needs-metadata')
    expect(await readdir(join(root, 'inbox'))).toEqual([])
  })

  it('rejects an irregular apparent-age range', async () => {
    const { store } = await createStore()
    const item = await store.ingest(await squarePortrait(), 'adult-portrait.png')
    await expect(store.setMetadata(item.id, {
      ageGroup: 'adult', apparentAgeMin: 32, apparentAgeMax: 42,
      gender: 'female', appearance: 'west-african', visualGroup: 'black',
      rights: 'Synthetic portrait for Persona', rightsEvidence: 'Local generation record',
    })).rejects.toThrow('Apparent age range')
  })
})
