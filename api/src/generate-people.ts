import type { GeneratedPeopleResponse } from './generated-person.js'
import type { PeopleQuery } from './people-query.js'
import { generatePersonWithoutPortrait, regeneratePersonName } from './generation-core.js'
import { geographicDataVersion } from './geography/data-version.js'
import { createGenerationContext } from './replay.js'
import type { PortraitCatalog } from './portraits/catalog.js'
import { selectPortraitFromCollection } from './portraits/collection-selection.js'
import { portraitSelectionVersion, resolvePortraitContexts } from './portraits/contexts.js'
import { maximumPageLimit } from './people-limits.js'

export function generatePeopleResponse(query: PeopleQuery, catalog: PortraitCatalog): GeneratedPeopleResponse {
  const versions = { dataVersion: geographicDataVersion, catalogVersion: catalog.version,
    portraitSelectionVersion: catalog.selectionVersion ?? portraitSelectionVersion }
  const context = createGenerationContext(query, versions)
  const generateBatch = (start: number, count: number) => {
    const usedPortraits = new Set<string>()
    const nameCounts = new Map<string, number>()
    return Array.from({ length: count }, (_, localIndex) => {
      const index = start + localIndex
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
        resolvePortraitContexts(query), query.skinTone)
      return { ...person, picture }
    })
  }
  let results: GeneratedPeopleResponse['results']
  if (query.pagination) {
    // Fixed canonical blocks preserve legacy prefixes and page-size independence.
    // At most two blocks are visited; late pages never replay the entire prefix.
    results = []
    const start = query.pagination.offset
    const end = start + query.count
    for (let block = Math.floor(start / maximumPageLimit) * maximumPageLimit; block < end; block += maximumPageLimit) {
      const people = generateBatch(block, Math.min(maximumPageLimit, end - block))
      results.push(...people.slice(Math.max(0, start - block), end - block))
    }
  } else results = generateBatch(0, query.count)
  return { results, meta: { count: query.count, asOf: query.asOf, seed: query.seed ?? null,
    ...(query.skinTone === undefined ? {} : { skinTone: typeof query.skinTone === 'number' ? query.skinTone : [...query.skinTone] }),
    ...(query.portraitContexts === undefined && query.portraitContext !== undefined ? { portraitContext: query.portraitContext }
      : { portraitContexts: [...resolvePortraitContexts(query)] }), ...versions } }
}
