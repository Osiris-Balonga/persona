// Reviewed citizenship-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as idNames } from './countries/ID/names.js'
import { names as sgNames } from './countries/SG/names.js'
import { names as thNames } from './countries/TH/names.js'
import { names as mvNames } from './countries/MV/names.js'
import { names as qaNames } from './countries/QA/names.js'

export const asiaAdditionalNames = {
  ID: idNames,
  SG: sgNames,
  TH: thNames,
  MV: mvNames,
  QA: qaNames,
} as const

export function isAsiaAdditionalCountry(code: string): code is keyof typeof asiaAdditionalNames {
  return Object.hasOwn(asiaAdditionalNames, code)
}
