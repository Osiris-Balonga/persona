import { readFileSync } from 'node:fs'

export const version: string = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

export function help(command: string | undefined, color: boolean): string {
  const resource = color ? 'logo.ansi' : 'logo.txt'
  const logo = readFileSync(new URL(`../assets/${resource}`, import.meta.url), 'utf8').trimEnd()
  const introduction = `${logo}\n\nPERSONA ${version}\nCoherent fictional people for fixtures and seeders.\n`
  const commands: Record<string, string> = {
    people: `Usage: persona people [options]

  --count <1-100>                  Number of people (default: 1)
  --gender <male|female>           Gender
  --age-group <groups>             child,teen,adult,senior (comma-separated)
  --nationality <code>             Reviewed two-letter nationality
  --residence-country <code>       Residence country
  --continent <name>              Nationality continent
  --city <name>                    City in the residence country
  --email-domain <domain>          Default: example.test
  --seed <value>                   Replay seed
  --as-of <YYYY-MM-DD>             Reference date (default: current UTC date)
  --fields <paths>                 Comma-separated public v2 fields
  --output <file>                  Save the full JSON envelope; create parent directories
  --force                         Replace an existing output file
  --api-url <base-url>             Override PERSONA_API_URL

Without --output, stdout is JSON only. Messages and errors go to stderr.
Default API: https://persona-dev.onrender.com (STAGING, not production).
Use both --seed and --as-of for replay against the same data/catalog/algorithm versions.
Requests are limited to 100 people; no batching or automatic retries.
`,
    countries: `Usage: persona countries [options]

  --country <code>                 Inspect one recognized country or territory
  --available                     Include only profile-available countries
  --json                          Print a versioned JSON snapshot

Coverage is bundled with this CLI version; it is not a live server capability query.
Postcode counts cover sampled cities. Format-valid phone fallbacks may be assigned;
never contact generated numbers. Profile readiness describes reviewed name pools.
`,
    'seed init': `Usage: persona seed init --adapter <prisma|generic> [--output <file>]

Create a seed template without changing application configuration or writing to a database.
Prisma default: prisma/seed.ts. Generic default: scripts/seed.ts.
Existing files are never overwritten. Adapt mapping and insertion before execution.
Prisma templates reuse your application's configured client; no schema inference.
`,
  }
  return `${introduction}\n${command ? commands[command] : `Usage: persona <command> [options]

  people                          Generate profiles as JSON or a fixture file
  countries                       Inspect bundled country data coverage
  seed init                       Create a seed template to adapt to your project

Examples:
  persona people --count 20 --seed demo --as-of 2026-09-30 --output people.json
  persona countries --country CG
  persona seed init --adapter prisma

No account or API key required. The default API is Render STAGING.
`}
  --help                          Show command help
  --version                       Show version (standalone)
  --no-color                      Disable help colors (also honors NO_COLOR)
`
}
