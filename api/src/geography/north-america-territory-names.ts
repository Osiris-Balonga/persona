// Reviewed country-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as awNames } from './countries/AW/names.js'
import { names as cwNames } from './countries/CW/names.js'
import { names as glNames } from './countries/GL/names.js'
import { names as gpNames } from './countries/GP/names.js'
import { names as mqNames } from './countries/MQ/names.js'
import { names as prNames } from './countries/PR/names.js'
import { names as viNames } from './countries/VI/names.js'

export const northAmericaTerritoryNames = {
  AW: awNames,
  CW: cwNames,
  GL: glNames,
  GP: gpNames,
  MQ: mqNames,
  PR: prNames,
  VI: viNames,
} as const

export function isNorthAmericaTerritoryCountry(code: string): code is keyof typeof northAmericaTerritoryNames {
  return Object.hasOwn(northAmericaTerritoryNames, code)
}
