// Reviewed Wikidata name components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as asNames } from './countries/AS/names.js'
import { names as guNames } from './countries/GU/names.js'
import { names as ncNames } from './countries/NC/names.js'
import { names as pfNames } from './countries/PF/names.js'

export const oceaniaTerritoryNames = {
  AS: asNames,
  GU: guNames,
  NC: ncNames,
  PF: pfNames,
} as const

export function isOceaniaTerritoryCountry(code: string): code is keyof typeof oceaniaTerritoryNames {
  return Object.hasOwn(oceaniaTerritoryNames, code)
}
