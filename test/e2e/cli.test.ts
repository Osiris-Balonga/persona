import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

const execute = promisify(execFile)
const executable = resolve('packages/cli/dist/index.js')

describe('CLI subprocess workflow', () => {
  it('generates replayable fixtures over HTTP, scaffolds a seeder and runs a developer-adapted insertion', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'persona-cli-e2e-'))
    const app = buildApp()
    try {
      const address = await app.listen({ host: '127.0.0.1', port: 0 })
      const command = ['people', '--count', '2', '--nationality', 'CG', '--age-group', 'adult',
        '--seed', 'cli-demo', '--as-of', '2026-09-30', '--api-url', address]
      const run = (args: string[]) => execute(process.execPath, [executable, ...args], { cwd, timeout: 15_000 })
      const first = await run(command)
      const second = await run(command)
      expect(JSON.parse(first.stdout)).toEqual(JSON.parse(second.stdout))
      expect(first.stderr).toBe('')
      await run([...command, '--output', 'scripts/fixtures/people.json'])
      const fixture = JSON.parse(await readFile(join(cwd, 'scripts/fixtures/people.json'), 'utf8'))
      expect(fixture.meta).toMatchObject({ count: 2, seed: 'cli-demo', asOf: '2026-09-30', schemaVersion: '2' })
      expect(fixture.results.every((person: { nationality: string }) => person.nationality === 'CG')).toBe(true)

      await writeFile(join(cwd, 'package.json'), '{"type":"module"}')
      await run(['seed', 'init', '--adapter', 'generic'])
      const seedPath = join(cwd, 'scripts/seed.ts')
      await expect(execute(process.execPath, [seedPath], { cwd, timeout: 15_000 }))
        .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('Adapt mapPerson') })

      // The application owns this adaptation. A file sink verifies the actual
      // transformed values without a database dependency or external writes.
      const source = await readFile(seedPath, 'utf8')
      const adapted = source.replace("import { readFile }", "import { readFile, writeFile }")
        .replace("throw new Error('Adapt mapPerson and implement insertPeople with your database client before running this seed.')",
          "await writeFile(new URL('./inserted.json', import.meta.url), JSON.stringify(people))")
      await writeFile(seedPath, adapted)
      const result = await execute(process.execPath, [seedPath], { cwd, timeout: 15_000 })
      expect(result.stdout).toContain('Seeded 2 people.')
      const inserted = JSON.parse(await readFile(join(cwd, 'scripts/inserted.json'), 'utf8'))
      expect(inserted[0]).toEqual({
        firstName: fixture.results[0].name.first, lastName: fixture.results[0].name.last,
        email: fixture.results[0].email, birthDate: new Date(fixture.results[0].dob.date).toISOString(),
        country: 'CG', city: fixture.results[0].location.city, avatarUrl: fixture.results[0].picture?.large ?? null,
      })
      await expect(run(['people', '--count', '101', '--api-url', address])).rejects.toMatchObject({
        code: 1, stdout: '', stderr: expect.stringContaining('400'),
      })
    } finally {
      await app.close()
      await rm(cwd, { recursive: true, force: true })
    }
  }, 30_000)
})
