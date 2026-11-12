// Reviewed country-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as cnNames } from './countries/CN/names.js'
import { names as hkNames } from './countries/HK/names.js'
import { names as jpNames } from './countries/JP/names.js'
import { names as kpNames } from './countries/KP/names.js'
import { names as krNames } from './countries/KR/names.js'
import { names as twNames } from './countries/TW/names.js'
import { names as vnNames } from './countries/VN/names.js'

export const asiaEastNames = {
  CN: cnNames,
  HK: hkNames,
  JP: jpNames,
  KP: kpNames,
  KR: krNames,
  TW: twNames,
  VN: vnNames,
} as const

export function isAsiaEastCountry(code: string): code is keyof typeof asiaEastNames {
  return Object.hasOwn(asiaEastNames, code)
}
