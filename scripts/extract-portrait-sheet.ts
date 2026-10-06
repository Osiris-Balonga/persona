import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import type { PortraitGenerationRecord, PortraitSheetBrief } from '../src/portraits/sheets.js'
import { extractPortraitGenerationRecord, extractPortraitSheet, isPortraitGenerationRecord } from '../src/portraits/sheets.js'

interface PortraitIndex {
  status: 'unreviewed'
  portraits: Array<{ portraitId: string; sheetId: string; tileId: string; sourceSha256: string }>
}

async function existingBytes(file: string): Promise<Buffer | undefined> {
  try { return await readFile(file) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

function stableJson(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
}

async function writeIfIdenticalOrNew(file: string, bytes: Buffer): Promise<void> {
  const existing = await existingBytes(file)
  if (existing !== undefined) {
    if (!existing.equals(bytes)) throw new Error(`${file} already exists with different content`)
    return
  }
  try { await writeFile(file, bytes, { flag: 'wx' }) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    const raced = await readFile(file)
    if (!raced.equals(bytes)) throw new Error(`${file} already exists with different content`)
  }
}

async function main(args: string[]): Promise<void> {
  if (args.length !== 3) throw new Error('Usage: npm run portraits:extract-sheet -- <source-image> <sheet-brief.json> <output-directory>')
  const [sourcePath, briefPath, outputPath] = args.map((argument) => resolve(argument))
  const source = await readFile(sourcePath)
  const briefJson = JSON.parse(await readFile(briefPath, 'utf8')) as unknown
  const extraction = isPortraitGenerationRecord(briefJson)
    ? await extractPortraitGenerationRecord(source, basename(sourcePath), briefJson as PortraitGenerationRecord)
    : await extractPortraitSheet(source, basename(sourcePath), briefJson as PortraitSheetBrief)
  const brief = extraction.sheetManifest
  const sheetDirectory = join(outputPath, brief.sheetId)
  const tileDirectory = join(sheetDirectory, 'tiles')

  const indexPath = join(outputPath, 'portrait-index.json')
  const existingIndexBytes = await existingBytes(indexPath)
  let index: PortraitIndex = { status: 'unreviewed', portraits: [] }
  if (existingIndexBytes !== undefined) {
    index = JSON.parse(existingIndexBytes.toString('utf8')) as PortraitIndex
    if (index.status !== 'unreviewed' || !Array.isArray(index.portraits)) throw new Error(`${indexPath} is invalid`)
  }
  const byId = new Map(index.portraits.map((entry) => [entry.portraitId, entry]))
  for (const tile of extraction.tiles) {
    const entry = { portraitId: tile.portraitId, sheetId: brief.sheetId, tileId: tile.tileId,
      sourceSha256: extraction.sheetManifest.source.sha256 }
    const existing = byId.get(entry.portraitId)
    if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) {
      throw new Error(`Duplicate portrait ID ${entry.portraitId} already belongs to ${existing.tileId}`)
    }
    byId.set(entry.portraitId, entry)
  }
  const nextIndex: PortraitIndex = { status: 'unreviewed', portraits: [...byId.values()].sort((a, b) =>
    a.portraitId < b.portraitId ? -1 : a.portraitId > b.portraitId ? 1 : 0) }

  const outputs: Array<{ path: string; bytes: Buffer }> = [
    { path: join(sheetDirectory, 'sheet-manifest.json'), bytes: stableJson(extraction.sheetManifest) },
    ...extraction.tiles.flatMap((tile) => [
      { path: join(tileDirectory, `${tile.portraitId}.png`), bytes: tile.bytes },
      { path: join(tileDirectory, `${tile.portraitId}.json`), bytes: stableJson(tile.manifest) },
    ]),
    { path: indexPath, bytes: stableJson(nextIndex) },
  ]

  for (const output of outputs) {
    const existing = await existingBytes(output.path)
    if (existing !== undefined && !existing.equals(output.bytes)) {
      throw new Error(`${output.path} already exists with different content`)
    }
  }
  await mkdir(tileDirectory, { recursive: true })
  await mkdir(dirname(indexPath), { recursive: true })
  for (const output of outputs) await writeIfIdenticalOrNew(output.path, output.bytes)
  console.log(JSON.stringify({ sheetId: brief.sheetId, sourceSha256: extraction.sheetManifest.source.sha256,
    extracted: extraction.tiles.length, portraitIds: extraction.tiles.map((tile) => tile.portraitId), outputDirectory: sheetDirectory }))
}

try { await main(process.argv.slice(2)) }
catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}
