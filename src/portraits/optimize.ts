import sharp from 'sharp'
import { inspectPortraitBytes } from './import.js'

const deliveredSize = 512
const maxBytes = 50_000

export async function optimizePortraitCandidate(master: Buffer): Promise<Buffer> {
  const source = sharp(master, { limitInputPixels: 16_000_000 })
  const metadata = await source.metadata()
  if (!metadata.width || !metadata.height || metadata.width !== metadata.height
    || metadata.width < deliveredSize || (metadata.pages ?? 1) !== 1) {
    throw new RangeError('Portrait master must be square and at least 512px with one frame')
  }
  const output = await source.resize(deliveredSize, deliveredSize).webp({ quality: 88, effort: 6 }).toBuffer()
  if (output.length >= maxBytes) throw new RangeError('Optimized portrait exceeds 50000 bytes')
  const info = await inspectPortraitBytes(output)
  if (info.format !== 'webp' || info.width !== deliveredSize || info.height !== deliveredSize || info.pages !== 1) {
    throw new RangeError('Optimized portrait is invalid')
  }
  return output
}
