import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { portraitCatalog } from '../src/portraits/manifest.js'
import { validatePortraitCatalog, type PortraitVariants } from '../src/portraits/catalog.js'
import { preparePortraitRenditions, renditionNames } from '../src/portraits/variants.js'

type PreparedAsset = { id: string; originalSha256: string; variants: PortraitVariants }
type Source = 'local' | 'r2' | 'auto'

const outputRoot = resolve(process.env.PERSONA_VARIANT_OUTPUT ?? 'staging/portraits/variants')
const sourceRoot = resolve(process.env.PERSONA_REVIEW_ROOT ?? 'staging/portraits/review', 'webp')
const source = (process.env.PERSONA_VARIANT_SOURCE ?? 'auto') as Source
if (!['local', 'r2', 'auto'].includes(source)) throw new Error('PERSONA_VARIANT_SOURCE must be local, r2 or auto')
const catalogErrors = validatePortraitCatalog(portraitCatalog)
if (catalogErrors.length || portraitCatalog.publicBaseUrl === null) {
  throw new Error(`Invalid source catalog: ${catalogErrors.join('; ')}`)
}

async function readOriginal(id: string, objectKey: string): Promise<Buffer> {
  if (source !== 'r2') {
    try { return await readFile(join(sourceRoot, `${id}.webp`)) }
    catch (error) {
      if (source === 'local' || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  const response = await fetch(`${portraitCatalog.publicBaseUrl}/${objectKey}`)
  if (!response.ok) throw new Error(`${id}: existing R2 original returned HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function writeOrConfirm(path: string, bytes: Buffer | string): Promise<void> {
  const data = typeof bytes === 'string' ? Buffer.from(bytes) : bytes
  try {
    const existing = await readFile(path)
    if (!existing.equals(data)) throw new Error(`Prepared file differs: ${path}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await writeFile(path, data, { flag: 'wx' })
  }
}

const prepared: PreparedAsset[] = []
const proposedAssets = []
for (const asset of portraitCatalog.assets) {
  if (asset.reviewStatus !== 'approved') {
    proposedAssets.push(asset)
    continue
  }
  const original = await readOriginal(asset.id, asset.objectKey)
  const result = await preparePortraitRenditions(original, asset, portraitCatalog.version)
  for (const size of renditionNames) {
    const directory = join(outputRoot, size)
    await mkdir(directory, { recursive: true })
    await writeOrConfirm(join(directory, `${asset.id}.webp`), result.bytes[size])
  }
  prepared.push({ id: asset.id, originalSha256: asset.sha256, variants: result.variants })
  proposedAssets.push({ ...asset, variants: result.variants })
  if (prepared.length % 25 === 0) console.log(`${prepared.length} approved portraits prepared`)
}

const proposal = { ...portraitCatalog, assets: proposedAssets }
const errors = validatePortraitCatalog(proposal)
if (errors.length) throw new Error(`Invalid proposed catalog: ${errors.join('; ')}`)
const plan = { catalogVersion: portraitCatalog.version, publicBaseUrl: portraitCatalog.publicBaseUrl, assets: prepared }
await mkdir(outputRoot, { recursive: true })
await writeOrConfirm(join(outputRoot, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`)
await writeOrConfirm(join(outputRoot, 'manifest-proposal.ts'),
  `import type { PortraitCatalog } from './catalog.js'\n\nexport const portraitCatalog: PortraitCatalog = ${JSON.stringify(proposal, null, 2)}\n`)
console.log(`Prepared ${prepared.length} approved portraits in ${outputRoot}; production manifest unchanged`)
