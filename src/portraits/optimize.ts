import sharp from 'sharp'
import { inspectPortraitBytes } from './import.js'

const deliveredSize = 512
const maxBytes = 50_000

export async function optimizePortraitCandidate(master: Buffer, xmp?: string): Promise<Buffer> {
  const source = sharp(master, { limitInputPixels: 16_000_000 })
  const metadata = await source.metadata()
  if (!metadata.width || !metadata.height || metadata.width !== metadata.height
    || metadata.width < deliveredSize || (metadata.pages ?? 1) !== 1) {
    throw new RangeError('Portrait master must be square and at least 512px with one frame')
  }
  const pipeline = source.resize(deliveredSize, deliveredSize).webp({ quality: 88, effort: 6 })
  const output = await (xmp === undefined ? pipeline : pipeline.withXmp(xmp)).toBuffer()
  if (output.length >= maxBytes) throw new RangeError('Optimized portrait exceeds 50000 bytes')
  const info = await inspectPortraitBytes(output)
  if (info.format !== 'webp' || info.width !== deliveredSize || info.height !== deliveredSize || info.pages !== 1) {
    throw new RangeError('Optimized portrait is invalid')
  }
  return output
}
