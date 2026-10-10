import type { GeneratedPeopleResponse } from './generated-person.js'
import type { PeopleQuery } from './people-query.js'
import { generatePersonWithoutPortrait, regeneratePersonName } from './generation-core.js'
import { geographicDataVersion } from './geography/data-version.js'
import { createGenerationContext } from './replay.js'
import type { PortraitCatalog } from './portraits/catalog.js'
import { selectPortraitFromCollection } from './portraits/collection-selection.js'
import { portraitSelectionVersion } from './portraits/contexts.js'

export function generatePeopleResponse(query: PeopleQuery, catalog: PortraitCatalog): GeneratedPeopleResponse {
  const versions = { dataVersion: geographicDataVersion, catalogVersion: catalog.version,
    portraitSelectionVersion: catalog.selectionVersion ?? portraitSelectionVersion }
  const context = createGenerationContext(query, versions)
  const usedPortraits = new Set<string>()
  const nameCounts = new Map<string, number>()
  const results = Array.from({ length: query.count }, (_, index) => {
    let person = generatePersonWithoutPortrait(query, context, index)
    let nameKey = `${person.country}\u0000${person.fullName}`
    let repetitions = nameCounts.get(nameKey) ?? 0
    // Keep a fresh seeded choice; otherwise prefer the least-used reviewed name.
    for (let attempt = 1; attempt <= 32 && repetitions > 0; attempt++) {
      const candidate = regeneratePersonName(person, query, context, index, attempt)
      const candidateKey = `${candidate.country}\u0000${candidate.fullName}`
      const candidateRepetitions = nameCounts.get(candidateKey) ?? 0
      if (candidateRepetitions < repetitions) {
        person = candidate
        nameKey = candidateKey
        repetitions = candidateRepetitions
      }
    }
    nameCounts.set(nameKey, repetitions + 1)
    const portraitKey = context.componentKey(index, 'portrait')
    const picture = selectPortraitFromCollection(catalog, person, person.country, portraitKey, usedPortraits,
      query.portraitContexts ?? query.portraitContext)
    return { ...person, picture }
  })
  return { results, meta: { count: query.count, asOf: query.asOf, seed: query.seed ?? null,
    ...(query.portraitContexts === undefined ? { portraitContext: query.portraitContext ?? 'standard' }
      : { portraitContexts: [...query.portraitContexts] }), ...versions } }
}
