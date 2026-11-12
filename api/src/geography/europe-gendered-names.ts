// Reviewed country-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as bgNames } from './countries/BG/names.js'
import { names as byNames } from './countries/BY/names.js'
import { names as cyNames } from './countries/CY/names.js'
import { names as czNames } from './countries/CZ/names.js'
import { names as grNames } from './countries/GR/names.js'
import { names as isNames } from './countries/IS/names.js'
import { names as ltNames } from './countries/LT/names.js'
import { names as lvNames } from './countries/LV/names.js'
import { names as mkNames } from './countries/MK/names.js'
import { names as plNames } from './countries/PL/names.js'
import { names as ruNames } from './countries/RU/names.js'
import { names as skNames } from './countries/SK/names.js'
import { names as uaNames } from './countries/UA/names.js'

export const europeGenderedNames = {
  BG: bgNames,
  BY: byNames,
  CY: cyNames,
  CZ: czNames,
  GR: grNames,
  IS: isNames,
  LT: ltNames,
  LV: lvNames,
  MK: mkNames,
  PL: plNames,
  RU: ruNames,
  SK: skNames,
  UA: uaNames,
} as const

export function isEuropeGenderedCountry(code: string): code is keyof typeof europeGenderedNames {
  return Object.hasOwn(europeGenderedNames, code)
}
