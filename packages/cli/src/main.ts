import { parseCommand } from './arguments.js'
import { help, version } from './help.js'
import { fetchPeople } from './people.js'
import { countryOutput } from './countries.js'
import { initializeSeed } from './seed.js'
import { writeOutput } from './files.js'

export type CliOptions = {
  cwd: string
  stdout: (text: string) => void
  stderr: (text: string) => void
  fetch: typeof fetch
  env: Record<string, string | undefined>
  isTTY: boolean
}

export async function runCli(args: string[], options: CliOptions): Promise<number> {
  try {
    const command = parseCommand(args)
    switch (command.kind) {
      case 'help':
        options.stdout(help(command.command, options.isTTY && !command.noColor && options.env.NO_COLOR === undefined))
        break
      case 'version': options.stdout(`${version}\n`); break
      case 'people': {
        const response = await fetchPeople(command, options.env, options.fetch)
        const content = `${JSON.stringify(response, null, 2)}\n`
        if (command.output) {
          await writeOutput(options.cwd, command.output, content, command.force)
          options.stderr(`Saved ${response.results.length} people to ${command.output}.\n`)
        } else options.stdout(content)
        break
      }
      case 'countries': options.stdout(await countryOutput(command)); break
      case 'seed': options.stdout(await initializeSeed(command, options.cwd)); break
    }
    return 0
  } catch (error) {
    options.stderr(`Error: ${error instanceof Error ? error.message : 'Command failed.'}\n`)
    return 1
  }
}
