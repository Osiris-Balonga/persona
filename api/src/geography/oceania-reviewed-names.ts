// Reviewed Wikidata name components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as auNames } from './countries/AU/names.js'
import { names as ckNames } from './countries/CK/names.js'
import { names as fjNames } from './countries/FJ/names.js'
import { names as fmNames } from './countries/FM/names.js'
import { names as nrNames } from './countries/NR/names.js'
import { names as nzNames } from './countries/NZ/names.js'
import { names as pgNames } from './countries/PG/names.js'
import { names as pwNames } from './countries/PW/names.js'
import { names as sbNames } from './countries/SB/names.js'
import { names as tlNames } from './countries/TL/names.js'
import { names as vuNames } from './countries/VU/names.js'
import { names as wsNames } from './countries/WS/names.js'

export const oceaniaReviewedNames = {
  AU: auNames,
  CK: ckNames,
  FJ: fjNames,
  FM: fmNames,
  NR: nrNames,
  NZ: nzNames,
  PG: pgNames,
  PW: pwNames,
  SB: sbNames,
  TL: tlNames,
  VU: vuNames,
  WS: wsNames,
} as const

export function isOceaniaReviewedCountry(code: string): code is keyof typeof oceaniaReviewedNames {
  return Object.hasOwn(oceaniaReviewedNames, code)
}
