// Reviewed citizenship-linked Wikidata candidates; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as azNames } from './countries/AZ/names.js'
import { names as kgNames } from './countries/KG/names.js'
import { names as kzNames } from './countries/KZ/names.js'
import { names as uzNames } from './countries/UZ/names.js'

export const asiaCentralNames = {
  AZ: azNames,
  KG: kgNames,
  KZ: kzNames,
  UZ: uzNames,
} as const

export function isAsiaCentralCountry(code: string): code is keyof typeof asiaCentralNames {
  return Object.hasOwn(asiaCentralNames, code)
}
