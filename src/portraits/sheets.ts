import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import { isPortraitCollection, type PortraitCollection } from '../review/collections.js'
import { contextAllowsAge, isPortraitContext, type PortraitContext } from './contexts.js'

export const portraitSheetQuadrants = ['TL', 'TR', 'BL', 'BR'] as const
export type PortraitSheetQuadrant = (typeof portraitSheetQuadrants)[number]
export type PortraitSheetGender = 'female' | 'male'

export interface PortraitSheetTileBrief {
  quadrant: PortraitSheetQuadrant
  portraitId: string
  context: PortraitContext
  gender: PortraitSheetGender
  intendedAge: number
}

export interface PortraitSheetBrief {
  sheetId: string
  collection: PortraitCollection
  generationProvenance: string
  rightsEvidence: string
  tiles: readonly PortraitSheetTileBrief[]
}

export interface PortraitGenerationRecord {
  sheetId: string
  collection: PortraitCollection
  portraitContext: PortraitContext
  intendedGender: PortraitSheetGender
  sourceFilename: string
  generator: string
  generationDate: string
  rightsEvidence: string
  sourceSha256: string
  sourceWidth: number
  sourceHeight: number
  tiles: readonly {
    quadrant: PortraitSheetQuadrant
    intendedApparentAge: number
    reviewStatus: 'pending'
    approvedAgeRanges: null
  }[]
}

export interface PortraitCrop {
  left: number
  top: number
  width: number
  height: number
}

export interface PortraitTileManifest {
  status: 'unreviewed'
  sheetId: string
  tileId: string
  portraitId: string
  quadrant: PortraitSheetQuadrant
  crop: PortraitCrop
  collection: PortraitCollection
  context: PortraitContext
  gender: PortraitSheetGender
  intendedAge: number
  source: { filename: string; sha256: string; width: number; height: number }
  generationProvenance: string
  rightsEvidence: string
  output: { filename: string; sha256: string; width: number; height: number }
}

export interface ExtractedPortraitTile {
  quadrant: PortraitSheetQuadrant
  tileId: string
  portraitId: string
  crop: PortraitCrop
  bytes: Buffer
  manifest: PortraitTileManifest
}

export interface PortraitSheetExtraction {
  sheetManifest: {
    status: 'unreviewed'
    sheetId: string
    collection: PortraitCollection
    generationProvenance: string
    rightsEvidence: string
    source: { filename: string; sha256: string; width: number; height: number }
    tiles: Array<{
      quadrant: PortraitSheetQuadrant
      tileId: string
      portraitId: string
      crop: PortraitCrop
      context: PortraitContext
      gender: PortraitSheetGender
      intendedAge: number
      sha256: string
    }>
  }
  tiles: ExtractedPortraitTile[]
}

export function isPortraitGenerationRecord(value: unknown): value is PortraitGenerationRecord {
  return typeof value === 'object' && value !== null && 'portraitContext' in value
    && 'sourceSha256' in value && 'intendedGender' in value
}

const safeId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function validateBrief(brief: PortraitSheetBrief): void {
  if (!safeId.test(brief.sheetId)) throw new RangeError('Invalid sheet ID')
  if (!isPortraitCollection(brief.collection)) throw new RangeError('Invalid portrait collection')
  if (!brief.generationProvenance.trim()) throw new RangeError('Generation provenance is required')
  if (!brief.rightsEvidence.trim()) throw new RangeError('Rights evidence is required')
  if (!Array.isArray(brief.tiles) || brief.tiles.length !== 4) throw new RangeError('A sheet brief must contain exactly four tiles')
  const ids = new Set<string>()
  const quadrants = new Set<PortraitSheetQuadrant>()
  for (const tile of brief.tiles) {
    if (!portraitSheetQuadrants.includes(tile.quadrant)) throw new RangeError(`Invalid quadrant ${tile.quadrant}`)
    if (quadrants.has(tile.quadrant)) throw new RangeError(`Duplicate quadrant ${tile.quadrant}`)
    quadrants.add(tile.quadrant)
    if (!safeId.test(tile.portraitId)) throw new RangeError(`Invalid portrait ID ${tile.portraitId}`)
    if (ids.has(tile.portraitId)) throw new RangeError(`Duplicate portrait ID ${tile.portraitId}`)
    ids.add(tile.portraitId)
    if (!isPortraitContext(tile.context)) throw new RangeError(`Invalid portrait context ${tile.context}`)
    if (tile.gender !== 'female' && tile.gender !== 'male') throw new RangeError(`Invalid gender for ${tile.portraitId}`)
    if (!contextAllowsAge(tile.context, tile.intendedAge)) {
      throw new RangeError(`Intended age for ${tile.portraitId} is outside ${tile.context} eligibility`)
    }
  }
}

export async function extractPortraitSheet(
  source: Buffer, sourceFilename: string, brief: PortraitSheetBrief,
): Promise<PortraitSheetExtraction> {
  validateBrief(brief)
  const image = sharp(source, { limitInputPixels: 100_000_000, animated: true })
  const metadata = await image.metadata()
  if ((metadata.pages ?? 1) !== 1) throw new RangeError('Portrait sheet must contain a single frame')
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width !== height || width < 1024 || width % 2 !== 0) {
    throw new RangeError('Portrait sheet must be square, even, and at least 1024x1024 pixels')
  }

  const tileSize = width / 2
  const crops: PortraitCrop[] = [
    { left: 0, top: 0, width: tileSize, height: tileSize },
    { left: tileSize, top: 0, width: tileSize, height: tileSize },
    { left: 0, top: tileSize, width: tileSize, height: tileSize },
    { left: tileSize, top: tileSize, width: tileSize, height: tileSize },
  ]
  const sourceHash = sha256(source)
  const tiles: ExtractedPortraitTile[] = []
  const briefsByQuadrant = new Map(brief.tiles.map((tile) => [tile.quadrant, tile]))
  for (let index = 0; index < portraitSheetQuadrants.length; index++) {
    const quadrant = portraitSheetQuadrants[index]
    const tileBrief = briefsByQuadrant.get(quadrant)!
    const crop = crops[index]
    const bytes = await sharp(source, { limitInputPixels: 100_000_000 })
      .extract(crop).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer()
    const tileId = `${brief.sheetId}:${quadrant}`
    const manifest: PortraitTileManifest = {
      status: 'unreviewed', sheetId: brief.sheetId, tileId, portraitId: tileBrief.portraitId,
      quadrant, crop, collection: brief.collection, context: tileBrief.context,
      gender: tileBrief.gender, intendedAge: tileBrief.intendedAge,
      source: { filename: path.basename(sourceFilename), sha256: sourceHash, width, height },
      generationProvenance: brief.generationProvenance,
      rightsEvidence: brief.rightsEvidence,
      output: { filename: `${tileBrief.portraitId}.png`, sha256: sha256(bytes), width: tileSize, height: tileSize },
    }
    tiles.push({ quadrant, tileId, portraitId: tileBrief.portraitId, crop, bytes, manifest })
  }

  return {
    sheetManifest: {
      status: 'unreviewed', sheetId: brief.sheetId, collection: brief.collection,
      generationProvenance: brief.generationProvenance, rightsEvidence: brief.rightsEvidence,
      source: { filename: path.basename(sourceFilename), sha256: sourceHash, width, height },
      tiles: tiles.map(({ quadrant, tileId, portraitId, crop, bytes, manifest }) => ({
        quadrant, tileId, portraitId, crop,
        context: manifest.context,
        gender: manifest.gender,
        intendedAge: manifest.intendedAge,
        sha256: sha256(bytes),
      })),
    },
    tiles,
  }
}

export async function extractPortraitGenerationRecord(
  source: Buffer, sourceFilename: string, record: PortraitGenerationRecord,
): Promise<PortraitSheetExtraction> {
  if (path.basename(sourceFilename) !== record.sourceFilename) {
    throw new RangeError('Source filename does not match generation record')
  }
  if (!/^[a-f0-9]{64}$/.test(record.sourceSha256) || sha256(source) !== record.sourceSha256) {
    throw new RangeError('Source SHA-256 does not match generation record')
  }
  const sourceMetadata = await sharp(source, { limitInputPixels: 100_000_000, animated: true }).metadata()
  if (sourceMetadata.width !== record.sourceWidth || sourceMetadata.height !== record.sourceHeight) {
    throw new RangeError('Source dimensions do not match generation record')
  }
  if (!record.generator?.trim() || !record.generationDate?.trim()) {
    throw new RangeError('Generator and generation date are required')
  }
  if (!Array.isArray(record.tiles) || record.tiles.length !== 4
    || record.tiles.some((tile) => tile.reviewStatus !== 'pending' || tile.approvedAgeRanges !== null)) {
    throw new RangeError('Generation record must contain four pending, unapproved tile briefs')
  }
  const brief: PortraitSheetBrief = {
    sheetId: record.sheetId,
    collection: record.collection,
    generationProvenance: `${record.generator} (${record.generationDate})`,
    rightsEvidence: record.rightsEvidence,
    tiles: record.tiles.map((tile) => ({
      quadrant: tile.quadrant,
      portraitId: `${record.sheetId}-${tile.quadrant}`,
      context: record.portraitContext,
      gender: record.intendedGender,
      intendedAge: tile.intendedApparentAge,
    })),
  }
  return extractPortraitSheet(source, sourceFilename, brief)
}
