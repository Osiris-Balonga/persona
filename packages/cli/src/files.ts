import { link, lstat, mkdir, open, rename, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

export async function writeOutput(cwd: string, file: string, content: string | AsyncIterable<string>, force = false): Promise<void> {
  const path = resolve(cwd, file)
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  let created = false
  try {
    if (!force) {
      const exists = await lstat(path).then(() => true, (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return false
        throw error
      })
      if (exists) throw Object.assign(new Error('Destination exists'), { code: 'EEXIST' })
    }
    const handle = await open(temporary, 'wx')
    created = true
    try {
      if (typeof content === 'string') await handle.writeFile(content, 'utf8')
      else for await (const chunk of content) await handle.writeFile(chunk, 'utf8')
    } finally { await handle.close() }
    if (force) await rename(temporary, path)
    else { await link(temporary, path); await rm(temporary) }
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
