import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PortraitReviewStore } from '../src/review/store.js'

const source = process.argv[2]
if (!source) throw new Error('Usage: npm run portraits:import-review -- <image-directory>')
const store = new PortraitReviewStore(resolve(process.env.PERSONA_REVIEW_ROOT ?? 'staging/portraits/review'))
const names = (await readdir(resolve(source))).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort()
let processed = 0
let errors = 0
for (const name of names) {
  const item = await store.ingest(await readFile(join(resolve(source), name)), name)
  if (item.status === 'processing-error') errors++
  else processed++
  process.stdout.write(`\r${processed + errors}/${names.length} · ${processed} traitées · ${errors} erreurs`)
}
process.stdout.write('\n')
