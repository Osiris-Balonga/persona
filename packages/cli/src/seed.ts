import { readFile } from 'node:fs/promises'
import type { Command } from './arguments.js'
import { writeOutput } from './files.js'

export async function initializeSeed(command: Extract<Command, { kind: 'seed' }>, cwd: string): Promise<string> {
  const output = command.output ?? (command.adapter === 'prisma' ? 'prisma/seed.ts' : 'scripts/seed.ts')
  const [shared, adapter] = await Promise.all([
    readFile(new URL('../templates/shared.ts.txt', import.meta.url), 'utf8'),
    readFile(new URL(`../templates/${command.adapter}.ts.txt`, import.meta.url), 'utf8'),
  ])
  await writeOutput(cwd, output, `${shared}\n${adapter}`)
  return `Created ${output}. No database operation was performed.

Next steps:
  1. Adapt the mapping and insertion to your application model.
  2. ${command.adapter === 'prisma' ? 'Import your configured Prisma client (including its driver adapter).' : 'Implement insertPeople with your database client.'}
  3. Generate full fixtures next to the seed file in fixtures/people.json:
     persona people --count 20 --seed demo --as-of 2026-09-30 --output <seed-directory>/fixtures/people.json
  4. Review the target database, then explicitly run your adapted seed script.

The template stops with an error until its insertion function is adapted.
See packages/cli/README.md in the Persona repository for the complete workflow.
`
}
