import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { validatePortraitCatalog, type PortraitAsset } from './catalog.js'

export interface PortraitReview extends PortraitAsset {
  rightsEvidence: string
  reviewer: string
  reviewedAt: string
  decisionReason: string
}

export interface PortraitFileInfo {
  format: string
  width: number
  height: number
  pages: number
  bytes: number
  sha256: string
}

export function validatePortraitReview(record: PortraitReview, file?: PortraitFileInfo): string[] {
  const errors: string[] = []
  const prefix = `${record.id}: `
  if (!record.reviewer?.trim()) errors.push(`${prefix}reviewer is required`)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt) ? new Date(`${record.reviewedAt}T00:00:00Z`) : null
  if (date === null || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== record.reviewedAt) {
    errors.push(`${prefix}review date is required`)
  }
  if (!record.decisionReason?.trim()) errors.push(`${prefix}decision reason is required`)
  if (!record.rightsEvidence?.trim()) errors.push(`${prefix}rights evidence is required`)
  const catalog = { version: record.catalogVersion, publicBaseUrl: 'https://images.example.test', assets: [record] }
  if (validatePortraitCatalog(catalog).length) errors.push(`${prefix}inconsistent catalog metadata`)
  if (file !== undefined) {
    if (file.format !== 'webp') errors.push(`${prefix}file is not WebP`)
    if (file.bytes < 1 || file.bytes >= 50_000) errors.push(`${prefix}file must be below 50,000 bytes`)
    if (file.width !== 512 || file.height !== 512) errors.push(`${prefix}dimensions must be 512x512`)
    if (file.pages !== 1) errors.push(`${prefix}animated images are not allowed`)
    if (file.sha256 !== record.sha256) errors.push(`${prefix}SHA-256 does not match`)
  }
  return errors
}

export async function inspectPortraitBytes(bytes: Buffer): Promise<PortraitFileInfo> {
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const metadata = await sharp(bytes, { limitInputPixels: 512 * 512 }).metadata()
  const info = {
    format: metadata.format ?? '', width: metadata.width ?? 0, height: metadata.height ?? 0,
    pages: metadata.pages ?? 1, bytes: bytes.length, sha256,
  }
  if (info.format === 'webp' && info.width === 512 && info.height === 512 && info.pages === 1 && info.bytes < 50_000) {
    await sharp(bytes, { limitInputPixels: 512 * 512 }).raw().toBuffer()
  }
  return info
}

function asAsset(record: PortraitReview): PortraitAsset {
  const { rightsEvidence: _rightsEvidence, reviewer: _reviewer, reviewedAt: _reviewedAt,
    decisionReason: _decisionReason, ...asset } = record
  return asset
}

export function evaluatePortraitImport(
  records: readonly PortraitReview[], fileInfo: ReadonlyMap<string, PortraitFileInfo>, publicBaseUrl: string,
): { approved: PortraitAsset[]; errors: string[] } {
  const errors: string[] = []
  const approved: PortraitAsset[] = []
  const ids = new Set<string>()
  const hashes = new Set<string>()
  const version = records[0]?.catalogVersion
  if (!version) errors.push('Batch is empty')
  for (const record of records) {
    errors.push(...validatePortraitReview(record))
    if (record.catalogVersion !== version) errors.push(`${record.id}: mixed catalog versions`)
    if (ids.has(record.id)) errors.push(`${record.id}: duplicate ID`)
    ids.add(record.id)
    if (hashes.has(record.sha256)) errors.push(`${record.id}: duplicate SHA-256`)
    hashes.add(record.sha256)
    if (record.reviewStatus !== 'approved' || !/^p_\d{4,}$/.test(record.id)) continue
    const file = fileInfo.get(record.id)
    if (file === undefined) errors.push(`${record.id}: unreadable or invalid image`)
    else errors.push(...validatePortraitReview(record, file))
    approved.push(asAsset(record))
  }
  if (version) errors.push(...validatePortraitCatalog({ version, publicBaseUrl, assets: approved }))
  return { approved: errors.length ? [] : approved, errors }
}

export async function preparePortraitImport(
  records: readonly PortraitReview[], readFile: (id: string) => Promise<Buffer>, publicBaseUrl: string,
): Promise<{ approved: PortraitAsset[]; errors: string[] }> {
  const files = new Map<string, PortraitFileInfo>()
  for (const record of records) {
    if (record?.reviewStatus !== 'approved' || !/^p_\d{4,}$/.test(record.id)) continue
    try { files.set(record.id, await inspectPortraitBytes(await readFile(record.id))) }
    catch { /* The batch evaluator reports a missing or invalid file. */ }
  }
  return evaluatePortraitImport(records, files, publicBaseUrl)
}
