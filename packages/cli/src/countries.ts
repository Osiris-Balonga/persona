import { readFile } from 'node:fs/promises'
import type { Command } from './arguments.js'

type Country = { code: string; name: string; profile: string; cities: number; citiesWithPostcode: number; phone: string }
type Snapshot = { dataVersion: string; countries: Country[] }

export async function countryOutput(command: Extract<Command, { kind: 'countries' }>): Promise<string> {
  const snapshot: Snapshot = JSON.parse(await readFile(new URL('../data/countries.json', import.meta.url), 'utf8'))
  if (command.country && !snapshot.countries.some((row) => row.code === command.country)) {
    throw new Error('Unknown country code. Use an uppercase, recognized two-letter code.')
  }
  const countries = snapshot.countries.filter((row) => (!command.country || row.code === command.country)
    && (!command.available || row.profile === 'available'))
  if (command.json) return `${JSON.stringify({ dataVersion: snapshot.dataVersion, countries }, null, 2)}\n`
  return [`Data version: ${snapshot.dataVersion} (bundled snapshot, not live coverage)`,
    'Code | Country or territory | Profile | Postcode cities / sampled | Phone',
    ...countries.map((row) => `${row.code} | ${row.name} | ${row.profile} | ${row.citiesWithPostcode}/${row.cities} | ${row.phone}`),
    '', 'Profile readiness describes reviewed name pools. Residence depends on available cities.',
    'Postcodes cover sampled cities only. Format-valid phones may be assigned; never contact them.', '',
  ].join('\n')
}
