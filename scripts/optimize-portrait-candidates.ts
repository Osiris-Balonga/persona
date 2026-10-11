import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { optimizePortraitCandidate } from '../src/portraits/optimize.js'

const input = process.argv[2]
if (!input) {
  console.error('Usage: npm run portraits:optimize -- <candidate-directory>')
  process.exitCode = 1
} else {
  try {
    const directory = resolve(input)
    const names = (await readdir(directory)).filter((name) => name.endsWith('.png')).sort()
    if (names.length === 0) throw new Error('No PNG candidates found')
    const outputDirectory = join(directory, 'webp')
    await mkdir(outputDirectory, { recursive: true })
    const results = []
    for (const name of names) {
      const master = await readFile(join(directory, name))
      const output = await optimizePortraitCandidate(master)
      const file = `${basename(name, '.png')}.webp`
      const destination = join(outputDirectory, file)
      let existing: Buffer | undefined
      try { existing = await readFile(destination) }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      if (existing !== undefined && !existing.equals(output)) throw new Error(`${file} already exists with different content`)
      if (existing === undefined) await writeFile(destination, output, { flag: 'wx' })
      results.push({ file, source: name, bytes: output.length,
        sha256: createHash('sha256').update(output).digest('hex') })
    }
    await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify({ status: 'unreviewed', width: 512,
      height: 512, format: 'webp', files: results }, null, 2)}\n`)
    console.log(JSON.stringify({ count: results.length, minBytes: Math.min(...results.map((entry) => entry.bytes)),
      maxBytes: Math.max(...results.map((entry) => entry.bytes)), totalBytes: results.reduce((sum, entry) => sum + entry.bytes, 0) }))
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 1
  }
}
