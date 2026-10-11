import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  extractPortraitGenerationRecord,
  extractPortraitSheet,
  type PortraitGenerationRecord,
  type PortraitSheetBrief,
} from '../../src/portraits/sheets.js'

const brief = (overrides: Partial<PortraitSheetBrief> = {}): PortraitSheetBrief => ({
  sheetId: 'ac-doctor-001',
  collection: 'africa-central',
  generationProvenance: 'OpenAI image generation, owner supplied',
  rightsEvidence: 'generation-record-001',
  tiles: [
    { quadrant: 'TL', portraitId: 'ac-doctor-001-tl', context: 'doctor', gender: 'female', intendedAge: 29 },
    { quadrant: 'TR', portraitId: 'ac-doctor-001-tr', context: 'doctor', gender: 'male', intendedAge: 31 },
    { quadrant: 'BL', portraitId: 'ac-doctor-001-bl', context: 'doctor', gender: 'female', intendedAge: 35 },
    { quadrant: 'BR', portraitId: 'ac-doctor-001-br', context: 'doctor', gender: 'male', intendedAge: 36 },
  ],
  ...overrides,
})

async function fourQuadrants(width = 1200, height = width): Promise<Buffer> {
  const halfWidth = Math.floor(width / 2)
  const halfHeight = Math.floor(height / 2)
  const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]]
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const quadrant = (y >= halfHeight ? 2 : 0) + (x >= halfWidth ? 1 : 0)
    const [red, green, blue] = colors[quadrant]
    const index = (y * width + x) * 3
    pixels[index] = red
    pixels[index + 1] = green
    pixels[index + 2] = blue
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer()
}

describe('portrait sheet extraction', () => {
  it('extracts exact TL, TR, BL, BR squares and writes source and tile traceability manifests', async () => {
    const source = await fourQuadrants()
    const result = await extractPortraitSheet(source, 'sheet.png', brief())
    expect(result.tiles.map((tile) => tile.quadrant)).toEqual(['TL', 'TR', 'BL', 'BR'])
    expect(result.tiles.map((tile) => tile.crop)).toEqual([
      { left: 0, top: 0, width: 600, height: 600 },
      { left: 600, top: 0, width: 600, height: 600 },
      { left: 0, top: 600, width: 600, height: 600 },
      { left: 600, top: 600, width: 600, height: 600 },
    ])
    expect(result.sheetManifest.source.sha256).toBe(createHash('sha256').update(source).digest('hex'))
    expect(result.sheetManifest.status).toBe('unreviewed')
    expect(result.tiles.map((tile) => tile.tileId)).toEqual([
      'ac-doctor-001:TL', 'ac-doctor-001:TR', 'ac-doctor-001:BL', 'ac-doctor-001:BR',
    ])
    for (const [index, tile] of result.tiles.entries()) {
      const { data, info } = await sharp(tile.bytes).raw().toBuffer({ resolveWithObject: true })
      expect(info).toMatchObject({ width: 600, height: 600, channels: 3 })
      expect([...data.subarray(0, 3)]).toEqual([[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]][index])
      expect(tile.manifest).toMatchObject({
        sheetId: 'ac-doctor-001', tileId: `ac-doctor-001:${tile.quadrant}`,
        portraitId: brief().tiles[index].portraitId,
        collection: 'africa-central', context: 'doctor', gender: brief().tiles[index].gender,
        intendedAge: brief().tiles[index].intendedAge,
        source: { filename: 'sheet.png', sha256: result.sheetManifest.source.sha256 },
        generationProvenance: 'OpenAI image generation, owner supplied',
        rightsEvidence: 'generation-record-001', status: 'unreviewed',
      })
    }
    const reordered = await extractPortraitSheet(source, 'sheet.png', brief({ tiles: [...brief().tiles].reverse() }))
    expect(reordered.tiles.map(({ quadrant, portraitId }) => [quadrant, portraitId]))
      .toEqual(result.tiles.map(({ quadrant, portraitId }) => [quadrant, portraitId]))
  })

  it('rejects non-square, odd-sized, multi-frame, and too-small sheets without resampling', async () => {
    for (const [width, height] of [[1200, 1100], [1201, 1201], [1022, 1022]]) {
      await expect(extractPortraitSheet(await fourQuadrants(width, height), 'bad.png', brief()))
        .rejects.toThrow(/square, even, and at least 1024/)
    }
    const pages = Buffer.alloc(1024 * 1024 * 3 * 2)
    pages.fill(40, 0, 1024 * 1024 * 3)
    pages.fill(180, 1024 * 1024 * 3)
    const animated = await sharp(pages, { raw: { width: 1024, height: 2048, channels: 3, pageHeight: 1024 } })
      .gif({ loop: 0, delay: 100 }).toBuffer()
    await expect(extractPortraitSheet(animated, 'multi.png', brief())).rejects.toThrow(/single frame/)
  })

  it('rejects missing or duplicate tile briefs, invalid IDs, and ages outside context eligibility', async () => {
    const source = await fourQuadrants()
    await expect(extractPortraitSheet(source, 'sheet.png', brief({ tiles: brief().tiles.slice(0, 3) })))
      .rejects.toThrow(/exactly four/)
    const duplicate = brief().tiles.map((tile) => ({ ...tile }))
    duplicate[1].portraitId = duplicate[0].portraitId
    await expect(extractPortraitSheet(source, 'sheet.png', brief({ tiles: duplicate })))
      .rejects.toThrow(/Duplicate portrait ID/)
    const duplicateQuadrants = brief().tiles.map((tile) => ({ ...tile }))
    duplicateQuadrants[1].quadrant = duplicateQuadrants[0].quadrant
    await expect(extractPortraitSheet(source, 'sheet.png', brief({ tiles: duplicateQuadrants })))
      .rejects.toThrow(/Duplicate quadrant/)
    await expect(extractPortraitSheet(source, 'sheet.png', brief({ sheetId: '../unsafe' })))
      .rejects.toThrow(/Invalid sheet ID/)
    const invalidAge = brief().tiles.map((tile) => ({ ...tile }))
    invalidAge[0].intendedAge = 24
    await expect(extractPortraitSheet(source, 'sheet.png', brief({ tiles: invalidAge })))
      .rejects.toThrow(/outside doctor eligibility/)
  })

  it('uses explicit generation-record fields and verifies its source hash and dimensions', async () => {
    const source = await fourQuadrants()
    const sourceSha256 = createHash('sha256').update(source).digest('hex')
    const record: PortraitGenerationRecord = {
      sheetId: 'AC-DOC-001', collection: 'africa-central', portraitContext: 'doctor',
      intendedGender: 'female', sourceFilename: 'AC-DOC-001.png', generator: 'fixture generator',
      generationDate: '2026-10-06T12:00:00.000Z', rightsEvidence: 'fixture rights record',
      sourceSha256, sourceWidth: 1200, sourceHeight: 1200,
      tiles: [
        { quadrant: 'TL', intendedApparentAge: 25, reviewStatus: 'pending', approvedAgeRanges: null },
        { quadrant: 'TR', intendedApparentAge: 28, reviewStatus: 'pending', approvedAgeRanges: null },
        { quadrant: 'BL', intendedApparentAge: 31, reviewStatus: 'pending', approvedAgeRanges: null },
        { quadrant: 'BR', intendedApparentAge: 34, reviewStatus: 'pending', approvedAgeRanges: null },
      ],
    }
    const result = await extractPortraitGenerationRecord(source, 'AC-DOC-001.png', record)
    expect(result.tiles.map(({ portraitId, quadrant }) => [portraitId, quadrant])).toEqual([
      ['AC-DOC-001-TL', 'TL'], ['AC-DOC-001-TR', 'TR'], ['AC-DOC-001-BL', 'BL'], ['AC-DOC-001-BR', 'BR'],
    ])
    expect(result.tiles.map(({ manifest }) => [manifest.gender, manifest.intendedAge, manifest.context]))
      .toEqual([['female', 25, 'doctor'], ['female', 28, 'doctor'], ['female', 31, 'doctor'], ['female', 34, 'doctor']])
    await expect(extractPortraitGenerationRecord(source, 'AC-DOC-001.png', { ...record, sourceSha256: '0'.repeat(64) }))
      .rejects.toThrow(/Source SHA-256 does not match generation record/)
    await expect(extractPortraitGenerationRecord(source, 'renamed.png', record))
      .rejects.toThrow(/Source filename does not match generation record/)
    await expect(extractPortraitGenerationRecord(source, 'AC-DOC-001.png', { ...record, sourceWidth: 2048 }))
      .rejects.toThrow(/Source dimensions do not match generation record/)
  })
})
