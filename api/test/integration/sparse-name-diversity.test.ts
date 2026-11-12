import { describe, expect, it } from 'vitest'
import { generatePeopleResponse } from '../../src/generate-people.js'
import { projectPeopleResponse } from '../../src/field-selection.js'
import { parsePeopleQuery } from '../../src/people-query.js'
import type { PortraitCatalog } from '../../src/portraits/catalog.js'

const catalog: PortraitCatalog = { version: 'name-diversity-test', publicBaseUrl: null, assets: [] }
const targets = [
  ['MM', 45], ['BT', 50], ['ET', 90], ['MW', 90], ['CG', 90],
  ['LS', 90], ['BW', 90], ['NA', 90], ['SC', 90], ['ZA', 100],
] as const

describe('sparse country name diversity', () => {
  it.each(targets)('offers more distinct names in a 100-person %s batch', (country, minimumUnique) => {
    for (const gender of ['female', 'male']) {
      const query = parsePeopleQuery(new URLSearchParams({
        nationality: country, gender, count: '100', ageGroup: 'adult',
        seed: 'sparse-name-diversity', asOf: '2026-11-11',
      }))
      const response = projectPeopleResponse(generatePeopleResponse(query, catalog))
      expect(new Set(response.results.map(person => person.name.full)).size, `${country}/${gender}`)
        .toBeGreaterThanOrEqual(minimumUnique)
    }
  })
})
