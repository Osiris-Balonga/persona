import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { preparePortraitImport } from '../src/portraits/import.js'
import { reviewedPortraitRecords } from '../src/review/export.js'
import type { ReviewItem } from '../src/review/store.js'

const reviewRoot = resolve(process.env.PERSONA_REVIEW_ROOT ?? 'staging/portraits/review')
const uploadOrigin = process.env.PERSONA_UPLOAD_ORIGIN ?? 'http://127.0.0.1:8788'
const publicBaseUrl = 'https://persona-portraits.osirisbalonga.workers.dev'
const origin = new URL(uploadOrigin)
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname)
  || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Upload endpoint must be local')

const items = JSON.parse(await readFile(join(reviewRoot, 'review-state.json'), 'utf8')) as ReviewItem[]
const records = reviewedPortraitRecords(items, 'v1')
const proposal = await preparePortraitImport(records,
  (id) => readFile(join(reviewRoot, 'webp', `${id}.webp`)), publicBaseUrl)
if (proposal.errors.length) throw new Error(`Preflight failed:\n${proposal.errors.join('\n')}`)
console.log(`Validated ${proposal.approved.length} approved portraits`)

let uploaded = 0
let existing = 0
const errors: string[] = []
for (let offset = 0; offset < proposal.approved.length; offset += 8) {
  await Promise.all(proposal.approved.slice(offset, offset + 8).map(async (asset) => {
    try {
      const bytes = await readFile(join(reviewRoot, 'webp', `${asset.id}.webp`))
      const response = await fetch(new URL(`/${asset.objectKey}`, uploadOrigin), {
        method: 'PUT', headers: { 'Content-Type': 'image/webp', 'X-Portrait-Sha256': asset.sha256 }, body: bytes,
      })
      if (response.status === 201) uploaded++
      else if (response.status === 200) existing++
      else errors.push(`${asset.id}: upload returned ${response.status}`)
    } catch (error) { errors.push(`${asset.id}: ${(error as Error).message}`) }
  }))
  console.log(`${Math.min(offset + 8, proposal.approved.length)}/${proposal.approved.length} checked`)
}
if (errors.length) throw new Error(`Publication incomplete:\n${errors.join('\n')}`)

await writeFile(resolve('src/portraits/manifest.ts'),
  `import type { PortraitCatalog } from './catalog.js'\n\nexport const portraitCatalog: PortraitCatalog = {\n`
  + `  version: 'v1',\n  publicBaseUrl: '${publicBaseUrl}',\n  assets: [\n`
  + proposal.approved.map((asset) => `    ${JSON.stringify(asset)},`).join('\n')
  + '\n  ],\n}\n')
console.log(`R2: ${uploaded} uploaded, ${existing} already present; manifest updated`)
