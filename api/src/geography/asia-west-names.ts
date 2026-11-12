// Reviewed country-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as aeNames } from './countries/AE/names.js'
import { names as afNames } from './countries/AF/names.js'
import { names as bhNames } from './countries/BH/names.js'
import { names as iqNames } from './countries/IQ/names.js'
import { names as joNames } from './countries/JO/names.js'
import { names as kwNames } from './countries/KW/names.js'
import { names as lbNames } from './countries/LB/names.js'
import { names as psNames } from './countries/PS/names.js'
import { names as saNames } from './countries/SA/names.js'
import { names as syNames } from './countries/SY/names.js'
import { names as yeNames } from './countries/YE/names.js'

export const asiaWestNames = {
  AE: aeNames,
  AF: afNames,
  BH: bhNames,
  IQ: iqNames,
  JO: joNames,
  KW: kwNames,
  LB: lbNames,
  PS: psNames,
  SA: saNames,
  SY: syNames,
  YE: yeNames,
} as const

export function isAsiaWestCountry(code: string): code is keyof typeof asiaWestNames {
  return Object.hasOwn(asiaWestNames, code)
}
