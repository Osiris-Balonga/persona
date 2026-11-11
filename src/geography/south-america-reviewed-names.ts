// Reviewed Wikidata name components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as arNames } from './countries/AR/names.js'
import { names as boNames } from './countries/BO/names.js'
import { names as brNames } from './countries/BR/names.js'
import { names as clNames } from './countries/CL/names.js'
import { names as coNames } from './countries/CO/names.js'
import { names as ecNames } from './countries/EC/names.js'
import { names as gyNames } from './countries/GY/names.js'
import { names as peNames } from './countries/PE/names.js'
import { names as pyNames } from './countries/PY/names.js'
import { names as srNames } from './countries/SR/names.js'
import { names as uyNames } from './countries/UY/names.js'
import { names as veNames } from './countries/VE/names.js'

export const southAmericaReviewedNames = {
  AR: arNames,
  BO: boNames,
  BR: brNames,
  CL: clNames,
  CO: coNames,
  EC: ecNames,
  GY: gyNames,
  PE: peNames,
  PY: pyNames,
  SR: srNames,
  UY: uyNames,
  VE: veNames,
} as const

export function isSouthAmericaReviewedCountry(code: string): code is keyof typeof southAmericaReviewedNames {
  return Object.hasOwn(southAmericaReviewedNames, code)
}
