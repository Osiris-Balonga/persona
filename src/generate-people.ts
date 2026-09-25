import type { PeopleResponse } from './contracts/people.js'
import type { PeopleQuery } from './people-query.js'
import { generatePersonWithoutPortrait } from './generation-core.js'
import { geographicDataVersion } from './geography/data-version.js'
import { createGenerationContext } from './replay.js'
import { selectPortrait, type PortraitCatalog } from './portraits/catalog.js'

export function generatePeopleResponse(query: PeopleQuery, catalog: PortraitCatalog): PeopleResponse {
  const versions = { dataVersion: geographicDataVersion, catalogVersion: catalog.version }
  const context = createGenerationContext(query, versions)
  const usedPortraits = new Set<string>()
  const nameCounts = new Map<string, number>()
  const results = Array.from({ length: query.count }, (_, index) => {
    let person = generatePersonWithoutPortrait(query, context, index)
    let nameKey = `${person.country}\u0000${person.fullName}`
    let repetitions = nameCounts.get(nameKey) ?? 0
    // Keep a fresh seeded choice; otherwise prefer the least-used reviewed name.
    for (let attempt = 1; attempt <= 32 && repetitions > 0; attempt++) {
      const candidate = generatePersonWithoutPortrait(query, context, index, attempt)
      const candidateKey = `${candidate.country}\u0000${candidate.fullName}`
      const candidateRepetitions = nameCounts.get(candidateKey) ?? 0
      if (candidateRepetitions < repetitions) {
        person = candidate
        nameKey = candidateKey
        repetitions = candidateRepetitions
      }
    }
    nameCounts.set(nameKey, repetitions + 1)
    const picture = selectPortrait(catalog, person, context.componentKey(index, 'portrait'), usedPortraits)
    return { ...person, picture }
  })
  return { results, meta: { count: query.count, asOf: query.asOf, seed: query.seed ?? null, ...versions } }
}
