import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import { portraitCoverageMatrix } from '../src/portraits/catalog.js'
import { preparePortraitImport } from '../src/portraits/import.js'
import { reviewedPortraitRecords } from '../src/review/export.js'
import type { ReviewItem } from '../src/review/store.js'

const root = resolve(process.env.PERSONA_REVIEW_ROOT ?? 'staging/portraits/review')
const items = JSON.parse(await readFile(join(root, 'review-state.json'), 'utf8')) as ReviewItem[]
const records = reviewedPortraitRecords(items, 'v1')
const errors: string[] = []
let maxFileBytes = 0
for (const item of items.filter((entry) => entry.status === 'approved')) {
  const webp = await readFile(join(root, 'webp', `${item.id}.webp`))
  maxFileBytes = Math.max(maxFileBytes, webp.length)
  const source = await readFile(join(root, 'masters', `${item.id}${item.sourceExtension}`))
  const sourceHash = createHash('sha256').update(source).digest('hex')
  if (sourceHash !== item.sourceSha256) errors.push(`${item.id}: source master hash differs from review record`)
  const xmp = (await sharp(webp).metadata()).xmpAsString ?? ''
  const expected = `persona:appearanceTags="${item.metadata?.appearanceTags?.join(',') ?? ''}"`
  if (!xmp.includes(expected)) errors.push(`${item.id}: embedded visual tags differ from review record`)
}
const proposal = await preparePortraitImport(records,
  (id) => readFile(join(root, 'webp', `${id}.webp`)), 'https://images.example.test')
errors.push(...proposal.errors)
const coverage = proposal.approved.length
  ? portraitCoverageMatrix({ version: 'v1', publicBaseUrl: 'https://images.example.test', assets: proposal.approved })
  : []
console.log(JSON.stringify({
  approved: records.length,
  multipleTags: records.filter((record) => (record.appearanceTags?.length ?? 0) > 1).length,
  maxFileBytes,
  coverageReady: coverage.filter((row) => row.ready).length,
  coverageTotal: coverage.length,
  coverageEmpty: coverage.filter((row) => row.approved === 0).length,
  reviewNotes: items.filter((item) => item.status === 'approved' && item.metadata?.reviewNotes).length,
  errors,
}, null, 2))
if (!records.length || errors.length) process.exitCode = 1
