import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PortraitReviewStore, type PortraitSourceProvenance } from '../src/review/store.js'
import { isPortraitCollection, type PortraitCollection } from '../src/review/collections.js'

const source = process.argv[2]
if (!source) throw new Error('Usage: npm run portraits:import-review -- <image-directory>')
const store = new PortraitReviewStore(resolve(process.env.PERSONA_REVIEW_ROOT ?? 'staging/portraits/review'))
const names = (await readdir(resolve(source))).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort()
let processed = 0
let errors = 0
for (const name of names) {
  const bytes = await readFile(join(resolve(source), name))
  let collection: PortraitCollection | undefined
  let sourceProvenance: PortraitSourceProvenance | undefined
  try {
    const stem = name.replace(/\.[^.]+$/, '')
    const manifest = JSON.parse(await readFile(join(resolve(source), `${stem}.json`), 'utf8'))
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (manifest.status !== 'unreviewed' || manifest.portraitId !== stem
      || manifest.output?.sha256 !== digest || manifest.output?.filename !== name
      || !manifest.sheetId || !manifest.quadrant || !manifest.generationProvenance || !manifest.rightsEvidence
      || !manifest.source?.sha256 || !manifest.context || !manifest.gender || !Number.isInteger(manifest.intendedAge)
      || !isPortraitCollection(manifest.collection)) {
      throw new Error(`${name}: extracted tile manifest does not match the image or has incomplete review provenance`)
    }
    collection = manifest.collection
    sourceProvenance = {
      sheetId: manifest.sheetId, quadrant: manifest.quadrant,
      generationProvenance: manifest.generationProvenance, sourceSha256: manifest.source.sha256,
      rightsEvidence: manifest.rightsEvidence, intendedContext: manifest.context,
      intendedGender: manifest.gender, intendedAge: manifest.intendedAge,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const item = await store.ingest(bytes, name, collection, sourceProvenance)
  if (item.status === 'processing-error') errors++
  else processed++
  process.stdout.write(`\r${processed + errors}/${names.length} · ${processed} traitées · ${errors} erreurs`)
}
process.stdout.write('\n')
