import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { preparePortraitImport, type PortraitReview } from '../src/portraits/import.js'

const batchPath = process.argv[2]
const publicBaseUrl = process.argv[3]
if (!batchPath || !publicBaseUrl) {
  console.error('Usage: npm run portraits:prepare -- <batch.json> <https-public-base-url>')
  process.exitCode = 1
} else {
  try {
    const absolutePath = resolve(batchPath)
    const records = JSON.parse(await readFile(absolutePath, 'utf8')) as PortraitReview[]
    if (!Array.isArray(records)) throw new Error('Batch must be an array')
    const result = await preparePortraitImport(records,
      (id) => readFile(join(dirname(absolutePath), `${id}.webp`)), publicBaseUrl)
    console.log(JSON.stringify(result, null, 2))
    if (result.errors.length) process.exitCode = 1
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 1
  }
}
