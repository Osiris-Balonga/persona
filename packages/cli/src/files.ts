import { mkdir, open, rename, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

export async function writeOutput(cwd: string, file: string, content: string, force = false): Promise<void> {
  const path = resolve(cwd, file)
  await mkdir(dirname(path), { recursive: true })
  const temporary = force ? `${path}.${randomUUID()}.tmp` : path
  let created = false
  try {
    const handle = await open(temporary, 'wx')
    created = true
    try { await handle.writeFile(content, 'utf8') } finally { await handle.close() }
    if (force) await rename(temporary, path)
    created = false
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`File already exists: ${file}. Choose another path${force ? '.' : ' or use --force for people output.'}`)
    }
    throw error
  } finally {
    if (created) await rm(temporary, { force: true })
  }
}
