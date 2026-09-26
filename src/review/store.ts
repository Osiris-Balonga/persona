import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { isAppearance, type Appearance } from '../geography/appearance.js'
import { ageGroupForAge } from '../age.js'
import { inspectPortraitBytes, type PortraitFileInfo } from '../portraits/import.js'
import { optimizePortraitCandidate } from '../portraits/optimize.js'
import { areConsecutivePortraitAgeRanges, isAdjacentPortraitAgeRange, isPortraitAgeRange } from './age-ranges.js'
import { isPortraitCollection, type PortraitCollection } from './collections.js'

export type ReviewStatus = 'processing-error' | 'needs-metadata' | 'ready-for-review' | 'approved' | 'rejected'
export interface PortraitMetadata {
  ageGroup: 'child' | 'teen' | 'adult' | 'senior'
  apparentAgeMin: number
  apparentAgeMax: number
  apparentAgeRanges?: readonly (readonly [number, number])[]
  secondaryAgeMin?: number
  secondaryAgeMax?: number
  gender: 'female' | 'male'
  appearance: Appearance
  visualGroup: string
  rights: string
  rightsEvidence: string
  reviewNotes?: string
}
export interface ReviewDecision { decision: 'approved' | 'rejected'; reviewer: string; reason: string; at: string }
export interface ReviewItem {
  id: string
  originalName: string
  collection?: PortraitCollection
  sourceSha256: string
  sourceExtension: string
  status: ReviewStatus
  createdAt: string
  technical?: PortraitFileInfo
  metadata?: PortraitMetadata
  decision?: ReviewDecision
  error?: string
}

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const xmlEscape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
function validateMetadata(input: PortraitMetadata): void {
  if (!input || !isPortraitAgeRange(input.ageGroup, input.apparentAgeMin, input.apparentAgeMax)) {
    throw new RangeError('Apparent age range is incompatible with age group')
  }
  if (input.apparentAgeRanges !== undefined
    && (!areConsecutivePortraitAgeRanges(input.apparentAgeRanges)
      || input.apparentAgeRanges[0][0] !== input.apparentAgeMin
      || input.apparentAgeRanges[0][1] !== input.apparentAgeMax
      || input.secondaryAgeMin !== undefined || input.secondaryAgeMax !== undefined)) {
    throw new RangeError('Apparent age ranges must be consecutive and start with the primary range')
  }
  if ((input.secondaryAgeMin !== undefined || input.secondaryAgeMax !== undefined)
    && !isAdjacentPortraitAgeRange(input.apparentAgeMin, input.apparentAgeMax,
      input.secondaryAgeMin as number, input.secondaryAgeMax as number)) {
    throw new RangeError('Secondary age range must be adjacent to the primary range')
  }
  if (!['female', 'male'].includes(input.gender) || !isAppearance(input.appearance)
    || !/^[a-z]+(?:-[a-z]+)*$/.test(input.visualGroup)
    || !input.rights?.trim() || !input.rightsEvidence?.trim()) throw new RangeError('Invalid portrait metadata')
}
function xmp(input: PortraitMetadata): string {
  const fields = {
    ageGroup: input.ageGroup, apparentAgeMin: input.apparentAgeMin, apparentAgeMax: input.apparentAgeMax,
    apparentAgeRanges: input.apparentAgeRanges?.map(([min, max]) => `${min}-${max}`).join(','),
    gender: input.gender, appearance: input.appearance, visualGroup: input.visualGroup,
  }
  const attributes = Object.entries(fields).filter(([, value]) => value !== undefined)
    .map(([name, value]) => `persona:${name}="${xmlEscape(String(value))}"`).join(' ')
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:persona="urn:persona:portrait:1" ${attributes}/></rdf:RDF></x:xmpmeta>`
}

export class PortraitReviewStore {
  private readonly file: string
  private operation: Promise<unknown> = Promise.resolve()
  constructor(readonly root: string) { this.file = join(root, 'review-state.json') }

  private async setup() {
    await Promise.all(['inbox', 'masters', 'webp'].map((folder) => mkdir(join(this.root, folder), { recursive: true })))
  }
  private async load(): Promise<ReviewItem[]> {
    await this.setup()
    try { return JSON.parse(await readFile(this.file, 'utf8')) as ReviewItem[] }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
  }
  private async save(items: ReviewItem[]) {
    const temporary = `${this.file}.tmp`
    await writeFile(temporary, JSON.stringify(items, null, 2))
    await rename(temporary, this.file)
  }
  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = this.operation.then(task, task)
    this.operation = result.catch(() => {})
    return result
  }
  async list() { await this.operation; return this.load() }
  async get(id: string) { return (await this.list()).find((item) => item.id === id) }
  async image(id: string) {
    if (!/^p_\d{4,}$/.test(id) || !(await this.get(id))) throw new RangeError('Unknown portrait')
    return readFile(join(this.root, 'webp', `${id}.webp`))
  }
  async ingest(bytes: Buffer, originalName: string, collection?: PortraitCollection): Promise<ReviewItem> {
    return this.serialize(async () => {
      if (collection !== undefined && !isPortraitCollection(collection)) throw new RangeError('Unknown portrait collection')
      if (!bytes.length || bytes.length > 20_000_000) throw new RangeError('Upload must be between 1 and 20 MB')
      const items = await this.load()
      const sourceSha256 = hash(bytes)
      const duplicate = items.find((item) => item.sourceSha256 === sourceSha256)
      if (duplicate) return duplicate
      const id = `p_${String(Math.max(0, ...items.map((item) => Number(item.id.slice(2)))) + 1).padStart(4, '0')}`
      const ext = extname(originalName).toLowerCase()
      const sourceExtension = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.img'
      const item: ReviewItem = { id, originalName: originalName.slice(0, 180), ...(collection ? { collection } : {}), sourceSha256,
        sourceExtension, status: 'needs-metadata', createdAt: new Date().toISOString() }
      const inbox = join(this.root, 'inbox', `${id}${sourceExtension}`)
      await writeFile(inbox, bytes)
      try {
        const optimized = await optimizePortraitCandidate(bytes)
        item.technical = await inspectPortraitBytes(optimized)
        await writeFile(join(this.root, 'webp', `${id}.webp`), optimized)
        await rename(inbox, join(this.root, 'masters', `${id}${sourceExtension}`))
      } catch (error) {
        item.status = 'processing-error'
        item.error = error instanceof Error ? error.message : 'Processing failed'
      }
      items.push(item)
      await this.save(items)
      return item
    })
  }
  async assignCollection(ids: string[], collection: PortraitCollection | null): Promise<ReviewItem[]> {
    return this.serialize(async () => {
      if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length
        || (collection !== null && !isPortraitCollection(collection))) throw new RangeError('Invalid portrait collection')
      const items = await this.load()
      const selected = ids.map((id) => items.find((item) => item.id === id))
      if (selected.some((item) => !item)) throw new RangeError('Unknown portrait')
      for (const item of selected as ReviewItem[]) {
        if (collection === null) delete item.collection
        else item.collection = collection
      }
      await this.save(items)
      return selected as ReviewItem[]
    })
  }
  async setMetadata(id: string, metadata: PortraitMetadata): Promise<ReviewItem> {
    return this.serialize(async () => {
      validateMetadata(metadata)
      const ranges = (metadata.apparentAgeRanges ?? [
        [metadata.apparentAgeMin, metadata.apparentAgeMax] as const,
        ...(metadata.secondaryAgeMin === undefined ? [] : [[metadata.secondaryAgeMin, metadata.secondaryAgeMax as number] as const]),
      ]).slice().sort(([a], [b]) => a - b)
      const normalized: PortraitMetadata = { ...metadata,
        ageGroup: ageGroupForAge(ranges[0][0]), apparentAgeMin: ranges[0][0], apparentAgeMax: ranges[0][1],
        apparentAgeRanges: ranges.map(([min, max]) => [min, max]) }
      delete normalized.secondaryAgeMin
      delete normalized.secondaryAgeMax
      const items = await this.load()
      const item = items.find((entry) => entry.id === id)
      if (!item || item.status === 'processing-error') throw new RangeError('Portrait is not processed')
      const master = await readFile(join(this.root, 'masters', `${id}${item.sourceExtension}`))
      const tagged = await optimizePortraitCandidate(master, xmp(normalized))
      const technical = await inspectPortraitBytes(tagged)
      if (technical.bytes >= 50_000) throw new RangeError('Tagged portrait exceeds 50000 bytes')
      await writeFile(join(this.root, 'webp', `${id}.webp`), tagged)
      item.metadata = normalized
      item.technical = technical
      item.status = 'ready-for-review'
      item.error = undefined
      item.decision = undefined
      await this.save(items)
      return item
    })
  }
  async decide(id: string, input: Omit<ReviewDecision, 'at'>): Promise<ReviewItem> {
    return this.serialize(async () => {
      const items = await this.load()
      const item = items.find((entry) => entry.id === id)
      if (!item) throw new RangeError('Unknown portrait')
      if (!input.reviewer?.trim() || !input.reason?.trim()
        || !['approved', 'rejected'].includes(input.decision)) throw new RangeError('Reviewer and reason are required')
      if (['approved', 'rejected'].includes(item.status)) {
        throw new RangeError('Reopen the portrait before changing its decision')
      }
      if (input.decision === 'approved' && (item.status !== 'ready-for-review' || !item.metadata || !item.technical)) {
        throw new RangeError('Metadata must be ready for review')
      }
      item.status = input.decision
      item.decision = { ...input, at: new Date().toISOString() }
      await this.save(items)
      return item
    })
  }
  async reopen(id: string): Promise<ReviewItem> {
    return this.serialize(async () => {
      const items = await this.load()
      const item = items.find((entry) => entry.id === id)
      if (!item || !['approved', 'rejected'].includes(item.status)) {
        throw new RangeError('Only a reviewed portrait can be reopened')
      }
      item.status = item.error ? 'processing-error'
        : item.metadata && item.technical ? 'ready-for-review' : 'needs-metadata'
      item.decision = undefined
      await this.save(items)
      return item
    })
  }
  async decideMany(ids: string[], input: Omit<ReviewDecision, 'at'>): Promise<ReviewItem[]> {
    return this.serialize(async () => {
      if (!Array.isArray(ids) || ids.length < 1
        || ids.some((id) => typeof id !== 'string' || !/^p_\d{4,}$/.test(id))
        || new Set(ids).size !== ids.length) throw new RangeError('Select distinct portraits')
      if (!input || !input.reviewer?.trim() || !input.reason?.trim()
        || !['approved', 'rejected'].includes(input.decision)) throw new RangeError('Reviewer and reason are required')
      const items = await this.load()
      const selected = ids.map((id) => items.find((item) => item.id === id))
      if (selected.some((item) => !item || item.status !== 'ready-for-review' || !item.metadata || !item.technical)) {
        throw new RangeError('Every selected portrait must be ready for review')
      }
      const decided = selected as ReviewItem[]
      const at = new Date().toISOString()
      for (const item of decided) {
        item.status = input.decision
        item.decision = { ...input, at }
      }
      await this.save(items)
      return decided
    })
  }
  async pendingFiles() { await this.setup(); return readdir(join(this.root, 'inbox')) }
  async processInbox(): Promise<ReviewItem[]> {
    const processed: ReviewItem[] = []
    for (const name of await this.pendingFiles()) {
      if (/^p_\d{4,}\./.test(name) || !/\.(png|jpe?g|webp)$/i.test(name)) continue
      const path = join(this.root, 'inbox', name)
      const item = await this.ingest(await readFile(path), name)
      await unlink(path)
      processed.push(item)
    }
    return processed
  }
}
