import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCli } from '../../packages/cli/src/main.js'
import { listCountryAvailability } from '../../src/geography/country-availability.js'
import { geographicDataVersion } from '../../src/geography/data-version.js'

const response = {
  results: [{ name: { first: 'Claire', last: 'Martin', full: 'Claire Martin' }, email: 'c.martin.abc@example.test' }],
  meta: { count: 1, asOf: '2026-09-30', seed: 'demo', schemaVersion: '2', dataVersion: 'fixture', catalogVersion: 'fixture' },
}

describe('CLI workflows', () => {
  let cwd: string
  let stdout: string
  let stderr: string
  beforeEach(async () => { cwd = await mkdtemp(join(tmpdir(), 'persona-cli-')); stdout = ''; stderr = '' })
  afterEach(async () => { await rm(cwd, { recursive: true, force: true }) })
  function options(fetcher = vi.fn(async () => Response.json(response))) {
    return { cwd, stdout: (text: string) => { stdout += text }, stderr: (text: string) => { stderr += text },
      fetch: fetcher, env: {}, isTTY: false }
  }

  it('keeps projected JSON stdout clean and encodes query values', async () => {
    const io = options()
    expect(await runCli(['people', '--fields', 'name,email', '--seed', 'demo & test', '--city', 'São Paulo',
      '--nationality', 'BR', '--api-url', 'http://localhost:3000'], io)).toBe(0)
    expect(JSON.parse(stdout)).toEqual(response)
    expect(stderr).toBe('')
    const url = new URL(String(io.fetch.mock.calls[0][0]))
    expect(url.pathname).toBe('/people')
    expect(url.searchParams.get('seed')).toBe('demo & test')
    expect(url.searchParams.get('city')).toBe('São Paulo')
  })

  it('exports an envelope into nested directories and preserves files unless overwrite is explicit', async () => {
    const io = options()
    const args = ['people', '--output', 'fixtures/people.json']
    expect(await runCli(args, io)).toBe(0)
    expect(stdout).toBe('')
    expect(stderr).toMatch(/1.*fixtures/)
    expect(JSON.parse(await readFile(join(cwd, 'fixtures/people.json'), 'utf8'))).toEqual(response)
    await writeFile(join(cwd, 'fixtures/people.json'), 'existing fixture')
    expect(await runCli(args, io)).toBe(1)
    expect(await readFile(join(cwd, 'fixtures/people.json'), 'utf8')).toBe('existing fixture')
    expect(await runCli([...args, '--force'], io)).toBe(0)
    expect(JSON.parse(await readFile(join(cwd, 'fixtures/people.json'), 'utf8'))).toEqual(response)
  })

  it('reports rate limits without retries or writing an error as fixtures', async () => {
    const fetcher = vi.fn(async () => Response.json({ error: { code: 'RATE_LIMITED', message: 'Request limit exceeded' } },
      { status: 429, headers: { 'retry-after': '60' } }))
    expect(await runCli(['people', '--output', 'people.json'], options(fetcher))).toBe(1)
    expect(stderr).toMatch(/429.*RATE_LIMITED/)
    expect(stderr).toMatch(/60/)
    expect(stdout).toBe('')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(await readdir(cwd)).toEqual([])
  })

  it.each([
    () => new Response('<html>upstream error</html>', { status: 502 }),
    () => Response.json({ results: [], meta: { schemaVersion: '1' } }),
  ])('rejects an invalid upstream response', async (makeResponse) => {
    expect(await runCli(['people'], options(vi.fn(async () => makeResponse())))).toBe(1)
    expect(stdout).toBe('')
  })

  it('rejects malformed profiles and oversized upstream JSON before writing fixtures', async () => {
    const malformed = vi.fn(async () => Response.json({ ...response, results: [null] }))
    expect(await runCli(['people', '--output', 'people.json'], options(malformed))).toBe(1)
    const oversized = vi.fn(async () => Response.json({ ...response, padding: 'x'.repeat(256 * 1024) }))
    expect(await runCli(['people', '--output', 'people.json'], options(oversized))).toBe(1)
    expect(await readdir(cwd)).toEqual([])
  })

  it('reports connection failures and validates endpoints before sending requests', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('fetch failed') })
    const io = options(fetcher)
    expect(await runCli(['people'], io)).toBe(1)
    expect(stderr).toMatch(/connect|network/i)
    fetcher.mockClear()
    expect(await runCli(['people', '--api-url', 'https://user:password@example.test'], io)).toBe(1)
    expect(stderr).not.toContain('password')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('uses an environment API URL unless overridden', async () => {
    const io = options()
    await runCli(['people'], { ...io, env: { PERSONA_API_URL: 'http://127.0.0.1:8000' } })
    expect(String(io.fetch.mock.calls[0][0])).toMatch(/^http:\/\/127.0.0.1:8000\/people/)
  })

  it('ships coverage matching the current catalogues and preserves partial country statuses', async () => {
    const io = options()
    expect(await runCli(['countries', '--json'], io)).toBe(0)
    expect(JSON.parse(stdout)).toEqual({ dataVersion: geographicDataVersion, countries: listCountryAvailability() })
    stdout = ''
    await runCli(['countries', '--country', 'CG', '--json'], io)
    expect(JSON.parse(stdout).countries).toEqual([expect.objectContaining({ code: 'CG', phone: 'format-valid', citiesWithPostcode: 0 })])
    stdout = ''
    await runCli(['countries', '--available', '--json'], io)
    expect(JSON.parse(stdout).countries.every((row: { profile: string }) => row.profile === 'available')).toBe(true)
  })

  it('does not turn a pending or unknown country into an available profile', async () => {
    expect(await runCli(['countries', '--country', 'PN', '--available', '--json'], options())).toBe(0)
    expect(JSON.parse(stdout).countries).toEqual([])
    stdout = ''
    expect(await runCli(['countries', '--country', 'ZZ'], options())).toBe(1)
    expect(stdout).toBe('')
  })

  it.each(['prisma', 'generic'])('creates a %s seed template without fetching or changing application configuration', async (adapter) => {
    const io = options()
    await writeFile(join(cwd, 'package.json'), '{"name":"customer-app"}')
    expect(await runCli(['seed', 'init', '--adapter', adapter], io)).toBe(0)
    const path = join(cwd, adapter === 'prisma' ? 'prisma/seed.ts' : 'scripts/seed.ts')
    const template = await readFile(path, 'utf8')
    expect(template).toContain('mapPerson')
    expect(template).toContain('fixtures/people.json')
    expect(template).toContain('Adapt')
    expect(io.fetch).not.toHaveBeenCalled()
    expect(await readFile(join(cwd, 'package.json'), 'utf8')).toBe('{"name":"customer-app"}')
    expect(await runCli(['seed', 'init', '--adapter', adapter], io)).toBe(1)
    expect(await readFile(path, 'utf8')).toBe(template)
    expect(stdout).toContain('mapping')
  })

  it('shows the brand only in discovery, honoring NO_COLOR and non-terminal output', async () => {
    const io = options()
    expect(await runCli([], { ...io, isTTY: true, env: { NO_COLOR: '' } })).toBe(0)
    expect(stdout).toContain('PERSONA')
    expect(stdout).toContain('seed init')
    expect(stdout).not.toContain('\u001b')
    expect(io.fetch).not.toHaveBeenCalled()
  })

  it('renders an opt-in Sixel image only for colored terminal help', async () => {
    const io = { ...options(), isTTY: true, env: { PERSONA_LOGO_FORMAT: 'sixel' } }
    expect(await runCli([], io)).toBe(0)
    expect(stdout).toMatch(/\u001bP[0-9;]*q/)
    expect(stdout).toContain('PERSONA')
    for (const override of [{ isTTY: false }, { env: { ...io.env, NO_COLOR: '' } }]) {
      stdout = ''
      await runCli([], { ...io, ...override })
      expect(stdout).not.toContain('\u001b')
    }
    stdout = ''
    await runCli(['--no-color'], io)
    expect(stdout).not.toContain('\u001b')
    stdout = ''
    await runCli(['people'], io)
    expect(JSON.parse(stdout)).toEqual(response)
  })
})
