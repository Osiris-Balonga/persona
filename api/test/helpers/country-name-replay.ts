import { createHash } from 'node:crypto'
import { projectPeopleResponse } from '../../src/field-selection.js'
import { generatePeopleResponse } from '../../src/generate-people.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import { portraitCatalog } from '../../src/portraits/manifest.js'

export function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function countryResponseFingerprint(country: string): string {
  const responses = []
  for (const gender of ['female', 'male']) {
    for (const ageGroup of ['child', 'teen', 'adult', 'senior']) {
      const query = parsePeopleQuery(new URLSearchParams({
        nationality: country, gender, ageGroup, count: '3',
        seed: 'country-name-layout', asOf: '2026-11-11',
      }))
      responses.push(projectPeopleResponse(generatePeopleResponse(query, portraitCatalog)))
    }
  }
  return fingerprint(responses)
}

export const batchReplayQueries = [
  ...['CG', 'MW', 'FR', 'MM', 'BT', 'ET', 'PL', 'KZ'].map(country => `nationality=${country}&count=100`),
  'nationality=FR&residenceCountry=CG&city=Brazzaville&count=20',
  'nationality=CG&residenceCountry=FR&city=Paris&count=20&fields=name,email,location',
  'continent=asia&count=100',
  'count=100',
].map(query => `/people?${query}&seed=country-name-layout&asOf=2026-11-11`)
