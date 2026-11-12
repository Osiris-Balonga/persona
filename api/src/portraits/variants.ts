import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { inspectPortraitBytes } from './import.js'
import type { PortraitAsset, PortraitVariants } from './catalog.js'

export const renditionPixels = { large: 512, medium: 256, thumbnail: 64 } as const
export const renditionNames = ['large', 'medium', 'thumbnail'] as const

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function verifyRendition(bytes: Buffer, pixels: number, expectedHash: string): Promise<void> {
  if (bytes.length < 1 || bytes.length >= 50_000 || sha256(bytes) !== expectedHash) {
    throw new Error(`Invalid ${pixels}px rendition bytes or SHA-256`)
  }
  const image = sharp(bytes, { limitInputPixels: 512 * 512 })
  const info = await image.metadata()
  if (info.format !== 'webp' || info.width !== pixels || info.height !== pixels || (info.pages ?? 1) !== 1) {
    throw new Error(`Invalid ${pixels}px WebP dimensions or frame count`)
  }
  await sharp(bytes, { limitInputPixels: 512 * 512 }).raw().toBuffer()
}

export async function preparePortraitRenditions(
  original: Buffer, asset: PortraitAsset, catalogVersion: string,
): Promise<{ variants: PortraitVariants; bytes: Record<keyof PortraitVariants, Buffer> }> {
  const originalInfo = await inspectPortraitBytes(original)
  if (originalInfo.format !== 'webp' || originalInfo.width !== 512 || originalInfo.height !== 512
    || originalInfo.pages !== 1 || originalInfo.bytes < 1 || originalInfo.bytes >= 50_000
    || originalInfo.sha256 !== asset.sha256) throw new Error(`${asset.id}: original 512px WebP does not match catalog`)

  // Keep the 512px rendition byte-identical to the already published original.
  const bytes = {
    large: original,
    medium: await sharp(original).resize(256, 256).webp({ quality: 82, effort: 6 }).toBuffer(),
    thumbnail: await sharp(original).resize(64, 64).webp({ quality: 82, effort: 6 }).toBuffer(),
  }
  const variants = Object.fromEntries(renditionNames.map((size) => [size, {
    objectKey: `portraits/${catalogVersion}/${size}/${asset.id}.webp`, sha256: sha256(bytes[size]),
  }])) as PortraitVariants
  for (const size of renditionNames) await verifyRendition(bytes[size], renditionPixels[size], variants[size].sha256)
  return { variants, bytes }
}
