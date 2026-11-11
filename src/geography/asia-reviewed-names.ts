// Reviewed country-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as amNames } from './countries/AM/names.js'
import { names as bdNames } from './countries/BD/names.js'
import { names as geNames } from './countries/GE/names.js'
import { names as ilNames } from './countries/IL/names.js'
import { names as inNames } from './countries/IN/names.js'
import { names as irNames } from './countries/IR/names.js'
import { names as lkNames } from './countries/LK/names.js'
import { names as npNames } from './countries/NP/names.js'
import { names as phNames } from './countries/PH/names.js'
import { names as pkNames } from './countries/PK/names.js'
import { names as trNames } from './countries/TR/names.js'

export const asiaReviewedNames = {
  AM: amNames,
  BD: bdNames,
  GE: geNames,
  IL: ilNames,
  IN: inNames,
  IR: irNames,
  LK: lkNames,
  NP: npNames,
  PH: phNames,
  PK: pkNames,
  TR: trNames,
} as const

export function isAsiaReviewedCountry(code: string): code is keyof typeof asiaReviewedNames {
  return Object.hasOwn(asiaReviewedNames, code)
}
