import { parseArgs } from 'node:util'

const queryOptions = {
  count: 'count', gender: 'gender', 'age-group': 'ageGroup', nationality: 'nationality',
  'residence-country': 'residenceCountry', continent: 'continent', city: 'city',
  'email-domain': 'emailDomain', seed: 'seed', 'as-of': 'asOf', fields: 'fields',
} as const
type HelpCommand = 'people' | 'countries' | 'seed init' | undefined
export type Command =
  | { kind: 'help'; command: HelpCommand; noColor: boolean }
  | { kind: 'version' }
  | { kind: 'people'; query: Record<string, string>; output?: string; force: boolean; apiUrl?: string }
  | { kind: 'countries'; country?: string; available: boolean; json: boolean }
  | { kind: 'seed'; adapter: 'prisma' | 'generic'; output?: string }

const stringOptions = [...Object.keys(queryOptions), 'output', 'api-url', 'country', 'adapter']
const booleanOptions = ['help', 'version', 'force', 'available', 'json', 'no-color']

export function parseCommand(args: string[]): Command {
  const { values, positionals, tokens } = parseArgs({ args, allowPositionals: true, strict: true, tokens: true,
    options: {
      ...Object.fromEntries(stringOptions.map((name) => [name, { type: 'string' as const }])),
      ...Object.fromEntries(booleanOptions.map((name) => [name, { type: 'boolean' as const }])),
    },
  })
  const seen = new Set<string>()
  for (const token of tokens) {
    if (token.kind !== 'option') continue
    if (seen.has(token.name)) throw new Error(`Repeated option --${token.name}.`)
    seen.add(token.name)
    if (typeof token.value === 'string' && !token.value.trim()) throw new Error(`--${token.name} cannot be blank.`)
  }
  const command = positionals.join(' ')
  if (!['', 'people', 'countries', 'seed init'].includes(command)) {
    throw new Error('Unknown command. Run persona --help.')
  }
  const allowed: Record<string, string[]> = {
    '': [], people: [...Object.keys(queryOptions), 'output', 'force', 'api-url'],
    countries: ['country', 'available', 'json'], 'seed init': ['adapter', 'output'],
  }
  for (const name of seen) {
    if (!['help', 'version', 'no-color', ...allowed[command]].includes(name)) {
      throw new Error(`--${name} is not supported by ${command || 'this command'}.`)
    }
  }
  if (values.version) {
    if (command || seen.size !== 1) throw new Error('Use persona --version on its own.')
    return { kind: 'version' }
  }
  if (values.help || command === '') {
    return { kind: 'help', command: command ? command as HelpCommand : undefined, noColor: !!values['no-color'] }
  }
  const string = (name: string) => values[name] as string | undefined
  if (command === 'people') {
    if (values.force && !values.output) throw new Error('--force requires --output.')
    const query: Record<string, string> = {}
    for (const [option, parameter] of Object.entries(queryOptions)) {
      if (values[option] !== undefined) query[parameter] = string(option)!
    }
    return { kind: 'people', query, output: string('output'), force: !!values.force, apiUrl: string('api-url') }
  }
  if (command === 'countries') {
    return { kind: 'countries', country: string('country'), available: !!values.available, json: !!values.json }
  }
  const adapter = string('adapter')
  if (adapter !== 'prisma' && adapter !== 'generic') throw new Error('--adapter must be prisma or generic.')
  return { kind: 'seed', adapter, output: string('output') }
}
