import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
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

async function replaceIndex(file: string, bytes: Buffer): Promise<void> {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, bytes, { flag: 'wx' })
  try { await rename(temporary, file) }
  catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}

async function parseIndex(bytes: Buffer | undefined, file: string): Promise<PortraitIndex> {
  if (bytes === undefined) return { status: 'unreviewed', portraits: [] }
  let parsed: PortraitIndex
  try { parsed = JSON.parse(bytes.toString('utf8')) as PortraitIndex }
  catch { throw new Error(`${file} is invalid`) }
  if (!parsed || typeof parsed !== 'object' || parsed.status !== 'unreviewed' || !Array.isArray(parsed.portraits)) {
    throw new Error(`${file} is invalid`)
  }
  const ids = new Set<string>()
  for (const entry of parsed.portraits) {
    if (!entry || typeof entry.portraitId !== 'string' || typeof entry.sheetId !== 'string'
      || typeof entry.tileId !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sourceSha256)
      || ids.has(entry.portraitId)) throw new Error(`${file} is invalid`)
    ids.add(entry.portraitId)
  }
  return parsed
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
  const lockPath = join(outputPath, '.portrait-index.lock')
  await mkdir(outputPath, { recursive: true })
  try { await writeFile(lockPath, `${process.pid}\n`, { flag: 'wx' }) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Another extraction is using ${outputPath}; run extractions for this output directory one at a time`)
    }
    throw error
  }
  try {
    const index = await parseIndex(await existingBytes(indexPath), indexPath)
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
    const indexBytes = stableJson(nextIndex)
    const outputs: Array<{ path: string; bytes: Buffer }> = [
      { path: join(sheetDirectory, 'sheet-manifest.json'), bytes: stableJson(extraction.sheetManifest) },
      ...extraction.tiles.flatMap((tile) => [
        { path: join(tileDirectory, `${tile.portraitId}.png`), bytes: tile.bytes },
        { path: join(tileDirectory, `${tile.portraitId}.json`), bytes: stableJson(tile.manifest) },
      ]),
    ]
    for (const output of outputs) {
      const existing = await existingBytes(output.path)
      if (existing !== undefined && !existing.equals(output.bytes)) {
        throw new Error(`${output.path} already exists with different content`)
      }
    }
    await mkdir(tileDirectory, { recursive: true })
    for (const output of outputs) await writeIfIdenticalOrNew(output.path, output.bytes)
    const existingIndexBytes = await existingBytes(indexPath)
    if (existingIndexBytes === undefined || !existingIndexBytes.equals(indexBytes)) await replaceIndex(indexPath, indexBytes)
    console.log(JSON.stringify({ sheetId: brief.sheetId, sourceSha256: extraction.sheetManifest.source.sha256,
      extracted: extraction.tiles.length, portraitIds: extraction.tiles.map((tile) => tile.portraitId), outputDirectory: sheetDirectory }))
  } finally {
    await rm(lockPath, { force: true })
  }
}

try { await main(process.argv.slice(2)) }
catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}
