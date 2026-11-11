import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const execute = promisify(execFile)

describe('CLI country snapshot maintenance', () => {
  it('accepts Windows line endings but detects a stale packaged snapshot', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'persona-country-snapshot-'))
    const generator = resolve('scripts/generate-country-availability.ts')
    const generate = (args: string[] = []) => execute(process.execPath,
      ['--import', import.meta.resolve('tsx'), generator, ...args], { cwd, timeout: 15_000 })
    try {
      // The generator's documentation directory exists in the actual repository.
      await mkdir(join(cwd, 'docs'))
      await generate()
      for (const path of ['docs/country-availability.md', 'packages/cli/data/countries.json']) {
        const file = join(cwd, path)
        await writeFile(file, (await readFile(file, 'utf8')).replaceAll('\n', '\r\n'))
      }
      await expect(generate(['--check'])).resolves.toMatchObject({ stderr: '' })
      const snapshot = join(cwd, 'packages/cli/data/countries.json')
      await writeFile(snapshot, '{}\n')
      await expect(generate(['--check'])).rejects.toMatchObject({
        code: 1, stderr: expect.stringContaining('CLI country availability snapshot is out of date'),
      })
    } finally { await rm(cwd, { recursive: true, force: true }) }
  }, 30_000)
})
