import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { portraitCatalog } from '../src/portraits/manifest.js'
import { validatePortraitCatalog, type PortraitVariants } from '../src/portraits/catalog.js'
import { renditionNames, renditionPixels, verifyRendition } from '../src/portraits/variants.js'

type Plan = { catalogVersion: string; publicBaseUrl: string; assets: {
  id: string; originalSha256: string; variants: PortraitVariants
}[] }

const outputRoot = resolve(process.env.PERSONA_VARIANT_OUTPUT ?? 'staging/portraits/variants')
if (process.argv.slice(2).some((argument) => argument !== '--publish')) {
  throw new Error('Usage: npx tsx scripts/publish-portrait-variants.ts [--publish]')
}
const publish = process.argv.includes('--publish')
const uploadOrigin = process.env.PERSONA_UPLOAD_ORIGIN ?? 'http://127.0.0.1:8788'
const origin = new URL(uploadOrigin)
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname)
  || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('Upload endpoint must be local')
}

const plan = JSON.parse(await readFile(join(outputRoot, 'plan.json'), 'utf8')) as Plan
const errors = validatePortraitCatalog(portraitCatalog)
if (errors.length || portraitCatalog.version !== plan.catalogVersion
  || portraitCatalog.publicBaseUrl !== plan.publicBaseUrl) throw new Error('Plan does not match the production catalog')
if (!Array.isArray(plan.assets) || new Set(plan.assets.map((asset) => asset.id)).size !== plan.assets.length) {
  throw new Error('Variant plan has duplicate or missing assets')
}

// Complete local preflight before the first R2 write. The uploader independently verifies each hash.
const uploads: { id: string; key: string; sha256: string; bytes: Buffer }[] = []
const active = portraitCatalog.assets.filter((asset) => asset.reviewStatus === 'approved')
const planned = new Map(plan.assets.map((asset) => [asset.id, asset]))
for (const asset of active) {
  const entry = planned.get(asset.id)
  if (entry === undefined || entry.originalSha256 !== asset.sha256 || asset.variants === undefined) {
    throw new Error(`${asset.id}: approved variant plan is missing or outdated`)
  }
  for (const size of renditionNames) {
    const proposed = entry.variants?.[size]
    const approved = asset.variants[size]
    if (proposed?.objectKey !== approved.objectKey || proposed?.sha256 !== approved.sha256) {
      throw new Error(`${asset.id}: ${size} variant differs from production manifest`)
    }
    const bytes = await readFile(join(outputRoot, size, `${asset.id}.webp`))
    await verifyRendition(bytes, renditionPixels[size], approved.sha256)
    uploads.push({ id: asset.id, key: approved.objectKey, sha256: approved.sha256, bytes })
  }
}

if (!publish) {
  console.log(`Validated ${uploads.length} variants for ${active.length} active portraits; no upload requested`)
} else {
  let uploaded = 0
  let existing = 0
  const failures: string[] = []
  const batchSize = 16
  for (let offset = 0; offset < uploads.length; offset += batchSize) {
    await Promise.all(uploads.slice(offset, offset + batchSize).map(async ({ id, key, sha256, bytes }) => {
      try {
        const response = await fetch(new URL(`/${key}`, origin), {
          method: 'PUT', headers: { 'Content-Type': 'image/webp', 'X-Portrait-Sha256': sha256 }, body: new Uint8Array(bytes),
        })
        if (response.status === 201) uploaded++
        else if (response.status === 200) existing++
        else failures.push(`${id} ${key}: HTTP ${response.status}`)
      } catch (error) { failures.push(`${id} ${key}: ${(error as Error).message}`) }
    }))
    if ((offset / batchSize) % 10 === 0 || offset + batchSize >= uploads.length) {
      console.log(`${Math.min(offset + batchSize, uploads.length)}/${uploads.length} variants checked`)
    }
  }
  if (failures.length) throw new Error(`Variant publication incomplete:\n${failures.join('\n')}`)
  console.log(`R2 variants: ${uploaded} uploaded, ${existing} already present; ${active.length} active portraits`)
}
