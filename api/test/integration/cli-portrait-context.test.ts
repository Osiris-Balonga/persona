import { describe, expect, it, vi } from 'vitest'
import { parseCommand } from '../../packages/cli/src/arguments.js'
import { runCli } from '../../packages/cli/src/main.js'
import { help } from '../../packages/cli/src/help.js'

describe('CLI portrait context selection', () => {
  it('forwards an explicit context and retains contextual response metadata', async () => {
    const envelope = { results: [{ picture: null }], meta: { count: 1, schemaVersion: '2',
      asOf: '2026-10-06', seed: 'doctor-demo', dataVersion: 'fixture', catalogVersion: 'v1',
      portraitContext: 'doctor', portraitSelectionVersion: 'contexts-v1' } }
    const fetcher = vi.fn(async () => Response.json(envelope))
    let output = ''
    const code = await runCli(['people', '--nationality', 'CG', '--portrait-context', 'doctor',
      '--age-group', 'adult', '--seed', 'doctor-demo', '--as-of', '2026-10-06'], {
      cwd: process.cwd(), env: {}, isTTY: false, fetch: fetcher,
      stdout: text => { output += text }, stderr: () => {},
    })
    expect(code).toBe(0)
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get('portraitContext')).toBe('doctor')
    expect(JSON.parse(output)).toEqual(envelope)
    expect(help('people', false)).toContain('--portrait-context')
  })

  it('rejects unknown or repeated contexts and leaves omitted defaults to the API', () => {
    expect(() => parseCommand(['people', '--portrait-context', 'astronaut'])).toThrow('Unknown portrait context')
    expect(() => parseCommand(['people', '--portrait-context', 'doctor', '--portrait-context', 'standard'])).toThrow('Repeated option')
    expect(parseCommand(['people'])).toMatchObject({ kind: 'people', query: {} })
  })
})
