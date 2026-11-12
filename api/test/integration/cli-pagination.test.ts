import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCli } from '../../packages/cli/src/main.js'

function page(offset: number, count: number, total = 225, limit = 100) {
  return { results: Array.from({ length: count }, (_, i) => ({ id: `person-${offset + i}` })),
    meta: { count, seed: 'fixed-seed', asOf: '2026-11-12', schemaVersion: '2', dataVersion: 'fixture',
      catalogVersion: 'fixture', portraitContexts: ['standard'],
      pagination: { total, limit, offset, nextCursor: offset + count < total ? `cursor-${offset + count}` : null } } }
}

describe('CLI paginated fixtures', () => {
  let cwd: string
  let stdout: string
  let stderr: string
  beforeEach(async () => { cwd = await mkdtemp(join(tmpdir(), 'persona-pagination-')); stdout = ''; stderr = '' })
  afterEach(async () => { vi.useRealTimers(); await rm(cwd, { recursive: true, force: true }) })
  function io(fetcher: typeof fetch) {
    return { cwd, stdout: (value: string) => { stdout += value }, stderr: (value: string) => { stderr += value },
      fetch: fetcher, env: {}, isTTY: false }
  }

  it('follows every cursor and produces one complete projected envelope on stdout', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(page(0, 100)))
      .mockResolvedValueOnce(Response.json(page(100, 100)))
      .mockResolvedValueOnce(Response.json(page(200, 25)))
    expect(await runCli(['people', '--count', '225', '--fields', 'id', '--nationality', 'CG'], io(fetcher))).toBe(0)
    const result = JSON.parse(stdout)
    expect(result.results).toHaveLength(225)
    expect(new Set(result.results.map((person: { id: string }) => person.id)).size).toBe(225)
    expect(result.results[224]).toEqual({ id: 'person-224' })
    expect(result.meta).toEqual({ ...page(0, 100).meta, count: 225, pagination: undefined })
    expect(stderr).toBe('')
    expect(fetcher).toHaveBeenCalledTimes(3)
    const continuation = new URL(String(fetcher.mock.calls[1][0]))
    expect([...continuation.searchParams]).toEqual([['cursor', 'cursor-100']])
  })

  it('forwards --limit and streams a temporary file before requesting the next page', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(page(0, 2, 3, 2)))
      .mockImplementationOnce(async (input) => {
        expect(new URL(String(input)).searchParams.get('cursor')).toBe('cursor-2')
        const files = await readdir(cwd)
        expect(files).toHaveLength(1)
        expect(files[0]).toMatch(/\.tmp$/)
        expect(await readFile(join(cwd, files[0]), 'utf8')).toContain('person-1')
        return Response.json(page(2, 1, 3, 2))
      })
    expect(await runCli(['people', '--count', '3', '--limit', '2', '--output', 'people.json'], io(fetcher))).toBe(0)
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get('limit')).toBe('2')
    expect(JSON.parse(await readFile(join(cwd, 'people.json'), 'utf8')).results).toHaveLength(3)
    expect(await readdir(cwd)).toEqual(['people.json'])
    expect(stdout).toBe('')
    expect(stderr).toContain('Saved 3 people')
  })

  it.each(['offset', 'seed', 'total', 'cursor', 'truncated', 'version'])('rejects %s drift without emitting partial stdout', async (failure) => {
    const second = page(100, 100)
    if (failure === 'offset') second.meta.pagination.offset = 99
    if (failure === 'seed') second.meta.seed = 'different'
    if (failure === 'total') second.meta.pagination.total = 226
    if (failure === 'cursor') second.meta.pagination.nextCursor = 'cursor-100'
    if (failure === 'truncated') second.meta.pagination.nextCursor = null
    if (failure === 'version') second.meta.dataVersion = 'new-data'
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(page(0, 100))).mockResolvedValueOnce(Response.json(second))
    expect(await runCli(['people', '--count', '225'], io(fetcher))).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toMatch(/pagination|metadata|cursor/i)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([false, true])('cleans a failed export and preserves an existing file (force=%s)', async (force) => {
    if (force) await writeFile(join(cwd, 'people.json'), 'existing')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(page(0, 100)))
      .mockResolvedValueOnce(Response.json({ error: { code: 'UNAVAILABLE', message: 'Try later' } }, { status: 503 }))
    expect(await runCli(['people', '--count', '225', '--output', 'people.json', ...(force ? ['--force'] : [])], io(fetcher))).toBe(1)
    expect(await readdir(cwd)).toEqual(force ? ['people.json'] : [])
    if (force) expect(await readFile(join(cwd, 'people.json'), 'utf8')).toBe('existing')
  })

  it('refuses an existing export before consuming the API quota', async () => {
    await writeFile(join(cwd, 'people.json'), 'existing')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page(0, 100)))
    expect(await runCli(['people', '--count', '225', '--output', 'people.json'], io(fetcher))).toBe(1)
    expect(fetcher).not.toHaveBeenCalled()
    expect(await readFile(join(cwd, 'people.json'), 'utf8')).toBe('existing')
    expect(await readdir(cwd)).toEqual(['people.json'])
  })

  it('waits for Retry-After before resuming the same cursor', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(page(0, 100)))
      .mockResolvedValueOnce(Response.json({ error: { code: 'RATE_LIMITED' } }, { status: 429, headers: { 'retry-after': '2' } }))
      .mockResolvedValueOnce(Response.json(page(100, 100))).mockResolvedValueOnce(Response.json(page(200, 25)))
    const completed = runCli(['people', '--count', '225'], io(fetcher))
    await vi.advanceTimersByTimeAsync(1999)
    expect(fetcher).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(await completed).toBe(0)
    expect(String(fetcher.mock.calls[1][0])).toBe(String(fetcher.mock.calls[2][0]))
    expect(JSON.parse(stdout).results).toHaveLength(225)
  })

  it.each([['--count', '10001'], ['--count', '0'], ['--limit', '101'], ['--limit', '1.5']])('rejects %s=%s before network access', async (option, value) => {
    const fetcher = vi.fn<typeof fetch>()
    expect(await runCli(['people', option, value], io(fetcher))).toBe(1)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('stops after three rate-limit retries instead of looping indefinitely', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(
      { error: { code: 'RATE_LIMITED' } }, { status: 429, headers: { 'retry-after': '2' } }))
    const completed = runCli(['people', '--count', '225'], io(fetcher))
    await vi.advanceTimersByTimeAsync(6000)
    expect(await completed).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(stdout).toBe('')
    expect(stderr).toMatch(/429.*retry budget exhausted/)
  })

  it.each(['121', 'invalid'])('does not retry earlier than an unsupported Retry-After: %s', async delay => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(
      { error: { code: 'RATE_LIMITED' } }, { status: 429, headers: { 'retry-after': delay } }))
    expect(await runCli(['people', '--count', '225'], io(fetcher))).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(stdout).toBe('')
  })
})
