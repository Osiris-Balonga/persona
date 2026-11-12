import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'

const temporaryDirectories: string[] = []
const metadata = {
  sheetId: 'ac-doctor-001', collection: 'africa-central',
  generationProvenance: 'synthetic CLI fixture', rightsEvidence: 'fixture-rights-001',
  tiles: [
    { quadrant: 'TL', portraitId: 'portrait-tl', context: 'doctor', gender: 'female', intendedAge: 29 },
    { quadrant: 'TR', portraitId: 'portrait-tr', context: 'doctor', gender: 'male', intendedAge: 31 },
    { quadrant: 'BL', portraitId: 'portrait-bl', context: 'doctor', gender: 'female', intendedAge: 35 },
    { quadrant: 'BR', portraitId: 'portrait-br', context: 'doctor', gender: 'male', intendedAge: 36 },
  ],
}

async function fixtureDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'persona-sheet-'))
  temporaryDirectories.push(directory)
  const pixels = Buffer.alloc(1200 * 1200 * 3, 128)
  const source = join(directory, 'sheet.png')
  await sharp(pixels, { raw: { width: 1200, height: 1200, channels: 3 } }).png().toFile(source)
  const brief = join(directory, 'brief.json')
  await writeFile(brief, `${JSON.stringify(metadata)}\n`)
  return { source, brief, output: join(directory, 'output') }
}

function runCli(source: string, brief: string, output: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/extract-portrait-sheet.ts', source, brief, output], {
    cwd: resolve('.'), encoding: 'utf8',
  })
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('portrait sheet extraction CLI', () => {
  it('writes four crops and manifests while retaining the source and safely accepts identical repeats', async () => {
    const { source, brief, output } = await fixtureDirectory()
    const originalSource = await readFile(source)
    const first = runCli(source, brief, output)
    expect(first.status, first.stderr).toBe(0)
    const files = await readdir(join(output, 'ac-doctor-001'))
    expect(files.sort()).toEqual(['sheet-manifest.json', 'tiles'])
    const tileFiles = await readdir(join(output, 'ac-doctor-001', 'tiles'))
    expect(tileFiles.sort()).toEqual([
      'portrait-bl.json', 'portrait-bl.png', 'portrait-br.json', 'portrait-br.png',
      'portrait-tl.json', 'portrait-tl.png', 'portrait-tr.json', 'portrait-tr.png',
    ])
    expect(await readFile(source)).toEqual(originalSource)
    const manifest = JSON.parse(await readFile(join(output, 'ac-doctor-001', 'sheet-manifest.json'), 'utf8'))
    expect(manifest.tiles).toHaveLength(4)
    expect(manifest.tiles[0]).toMatchObject({
      quadrant: 'TL', tileId: 'ac-doctor-001:TL', portraitId: 'portrait-tl',
      context: 'doctor', gender: 'female', intendedAge: 29,
      crop: { left: 0, top: 0, width: 600, height: 600 },
    })
    expect(runCli(source, brief, output).status).toBe(0)
    expect(await readFile(source)).toEqual(originalSource)
  }, 60_000)

  it('refuses a conflicting existing tile without overwriting it or the source', async () => {
    const { source, brief, output } = await fixtureDirectory()
    const initial = runCli(source, brief, output)
    expect(initial.status, initial.stderr).toBe(0)
    const tile = join(output, 'ac-doctor-001', 'tiles', 'portrait-tl.png')
    const changed = Buffer.from('existing different content')
    await writeFile(tile, changed)
    const originalSource = await readFile(source)
    const conflict = runCli(source, brief, output)
    expect(conflict.status).not.toBe(0)
    expect(conflict.stderr).toMatch(/already exists with different content/)
    expect(await readFile(tile)).toEqual(changed)
    expect(await readFile(source)).toEqual(originalSource)
  }, 60_000)

  it('rejects a portrait ID already assigned to a different source tile before writing the new sheet', async () => {
    const { source, brief, output } = await fixtureDirectory()
    const initial = runCli(source, brief, output)
    expect(initial.status, initial.stderr).toBe(0)
    const otherBrief = join(dirname(brief), 'other-brief.json')
    const duplicateIdBrief = { ...metadata, sheetId: 'ac-doctor-002',
      tiles: metadata.tiles.map((tile, index) => ({ ...tile,
        portraitId: index === 0 ? 'portrait-tl' : `other-${tile.portraitId}` })) }
    await writeFile(otherBrief, `${JSON.stringify(duplicateIdBrief)}\n`)
    const conflict = runCli(source, otherBrief, output)
    expect(conflict.status).not.toBe(0)
    expect(conflict.stderr).toMatch(/Duplicate portrait ID portrait-tl/)
    expect((await readdir(output)).sort()).toEqual(['ac-doctor-001', 'portrait-index.json'])
  }, 60_000)

  it('merges a second sheet into the shared ID index and preserves prior output across retries', async () => {
    const { source, brief, output } = await fixtureDirectory()
    const first = runCli(source, brief, output)
    expect(first.status, first.stderr).toBe(0)
    const firstSheetDirectory = join(output, 'ac-doctor-001')
    const firstTileNames = await readdir(join(firstSheetDirectory, 'tiles'))
    const firstBytes = new Map(await Promise.all([
      ...firstTileNames.map(async (name) => [name, await readFile(join(firstSheetDirectory, 'tiles', name))] as const),
      ['sheet-manifest.json', await readFile(join(firstSheetDirectory, 'sheet-manifest.json'))] as const,
    ]))

    const secondSource = join(dirname(source), 'second-sheet.png')
    await sharp({ create: { width: 1200, height: 1200, channels: 3, background: '#a34e82' } })
      .png().toFile(secondSource)
    const secondBrief = join(dirname(brief), 'second-brief.json')
    const secondMetadata = { ...metadata, sheetId: 'ac-doctor-002',
      tiles: metadata.tiles.map((tile) => ({ ...tile, portraitId: `second-${tile.portraitId}` })) }
    await writeFile(secondBrief, `${JSON.stringify(secondMetadata)}\n`)
    const second = runCli(secondSource, secondBrief, output)
    expect(second.status, second.stderr).toBe(0)

    const indexPath = join(output, 'portrait-index.json')
    const index = JSON.parse(await readFile(indexPath, 'utf8'))
    expect(index.portraits).toHaveLength(8)
    expect(new Set(index.portraits.map((entry: { portraitId: string }) => entry.portraitId)).size).toBe(8)
    for (const [name, bytes] of firstBytes) {
      const file = name === 'sheet-manifest.json' ? join(firstSheetDirectory, name) : join(firstSheetDirectory, 'tiles', name)
      expect(await readFile(file)).toEqual(bytes)
    }
    const secondIndexBytes = await readFile(indexPath)
    const secondSheetDirectory = join(output, 'ac-doctor-002')
    const secondTileNames = await readdir(join(secondSheetDirectory, 'tiles'))
    const secondBytes = new Map(await Promise.all([
      ...secondTileNames.map(async (name) => [name, await readFile(join(secondSheetDirectory, 'tiles', name))] as const),
      ['sheet-manifest.json', await readFile(join(secondSheetDirectory, 'sheet-manifest.json'))] as const,
    ]))
    const repeated = runCli(secondSource, secondBrief, output)
    expect(repeated.status, repeated.stderr).toBe(0)
    expect(await readFile(indexPath)).toEqual(secondIndexBytes)
    for (const [name, bytes] of secondBytes) {
      const file = name === 'sheet-manifest.json' ? join(secondSheetDirectory, name) : join(secondSheetDirectory, 'tiles', name)
      expect(await readFile(file)).toEqual(bytes)
    }
  }, 60_000)

  it('fails closed when another process owns the output index lock', async () => {
    const { source, brief, output } = await fixtureDirectory()
    await mkdir(output, { recursive: true })
    await writeFile(join(output, '.portrait-index.lock'), 'another process\n', { flag: 'wx' })
    const result = runCli(source, brief, output)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/run extractions for this output directory one at a time/)
    expect(await readdir(output)).toEqual(['.portrait-index.lock'])
  }, 60_000)

  it('accepts a generation record with explicit context, gender, age, and matching source integrity fields', async () => {
    const { source, output } = await fixtureDirectory()
    const sourceBytes = await readFile(source)
    const record = {
      sheetId: 'AC-DOC-RECORD-001', collection: 'africa-central', portraitContext: 'doctor',
      intendedGender: 'female', sourceFilename: 'sheet.png', generator: 'synthetic fixture',
      generationDate: '2026-10-06T12:00:00.000Z', rightsEvidence: 'fixture rights record',
      sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'), sourceWidth: 1200, sourceHeight: 1200,
      tiles: metadata.tiles.map((tile) => ({ quadrant: tile.quadrant, intendedApparentAge: tile.intendedAge,
        reviewStatus: 'pending', approvedAgeRanges: null })),
    }
    const recordPath = join(dirname(source), 'generation-record.json')
    await writeFile(recordPath, `${JSON.stringify(record)}\n`)
    const result = runCli(source, recordPath, output)
    expect(result.status, result.stderr).toBe(0)
    const tile = JSON.parse(await readFile(join(output, record.sheetId, 'tiles', 'AC-DOC-RECORD-001-TL.json'), 'utf8'))
    expect(tile).toMatchObject({ portraitId: 'AC-DOC-RECORD-001-TL', context: 'doctor', gender: 'female', intendedAge: 29 })
    expect(tile.source.sha256).toBe(record.sourceSha256)
  }, 60_000)
})
