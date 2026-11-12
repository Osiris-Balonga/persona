// Reviewed Wikidata name components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as fkNames } from './countries/FK/names.js'
import { names as gfNames } from './countries/GF/names.js'

export const southAmericaTerritoryNames = {
  FK: fkNames,
  GF: gfNames,
} as const

export function isSouthAmericaTerritoryCountry(code: string): code is keyof typeof southAmericaTerritoryNames {
  return Object.hasOwn(southAmericaTerritoryNames, code)
}
