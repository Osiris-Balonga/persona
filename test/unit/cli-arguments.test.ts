import { describe, expect, it } from 'vitest'
import { parseCommand } from '../../packages/cli/src/arguments.js'

describe('CLI arguments', () => {
  it('maps terminal option names to the v2 API without changing values', () => {
    expect(parseCommand(['people', '--count', '20', '--age-group', 'adult,senior', '--nationality', 'FR',
      '--residence-country', 'CG', '--city', 'Brazzaville', '--seed', 'demo', '--as-of', '2026-09-30',
      '--email-domain', 'example.test', '--fields', 'name,email', '--output', 'people.json'])).toEqual({
      kind: 'people', query: { count: '20', ageGroup: 'adult,senior', nationality: 'FR', residenceCountry: 'CG',
        city: 'Brazzaville', seed: 'demo', asOf: '2026-09-30', emailDomain: 'example.test', fields: 'name,email' },
      output: 'people.json', force: false, apiUrl: undefined,
    })
  })

  it.each([
    ['people', '--age', '32'], ['people', '--count', '2', '--count', '3'],
    ['people', '--seed', ''], ['people', 'extra'], ['countries', '--seed', 'demo'],
    ['seed', 'init', '--adapter', 'unknown'], ['seed'], ['people', '--force'],
  ])('rejects ambiguous or unsupported input: %j', (...args) => {
    expect(() => parseCommand(args)).toThrow()
  })

  it('requires an explicit seed adapter and exposes command-specific help', () => {
    expect(() => parseCommand(['seed', 'init'])).toThrow(/adapter/i)
    expect(parseCommand(['seed', 'init', '--adapter', 'prisma'])).toMatchObject({ kind: 'seed', adapter: 'prisma' })
    expect(parseCommand(['people', '--help'])).toEqual({ kind: 'help', command: 'people', noColor: false })
  })
})
