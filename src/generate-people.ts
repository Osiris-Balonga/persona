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
  const results = Array.from({ length: query.count }, (_, index) => {
    const person = generatePersonWithoutPortrait(query, context, index)
    const picture = selectPortrait(catalog, person, context.componentKey(index, 'portrait'), usedPortraits)
    return { ...person, picture }
  })
  return { results, meta: { count: query.count, asOf: query.asOf, seed: query.seed ?? null, ...versions } }
}
