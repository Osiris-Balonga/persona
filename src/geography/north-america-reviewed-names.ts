// Reviewed country-linked Wikidata candidate components; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as agNames } from './countries/AG/names.js'
import { names as bbNames } from './countries/BB/names.js'
import { names as bmNames } from './countries/BM/names.js'
import { names as bsNames } from './countries/BS/names.js'
import { names as bzNames } from './countries/BZ/names.js'
import { names as caNames } from './countries/CA/names.js'
import { names as crNames } from './countries/CR/names.js'
import { names as cuNames } from './countries/CU/names.js'
import { names as dmNames } from './countries/DM/names.js'
import { names as doNames } from './countries/DO/names.js'
import { names as gdNames } from './countries/GD/names.js'
import { names as gtNames } from './countries/GT/names.js'
import { names as hnNames } from './countries/HN/names.js'
import { names as htNames } from './countries/HT/names.js'
import { names as jmNames } from './countries/JM/names.js'
import { names as knNames } from './countries/KN/names.js'
import { names as lcNames } from './countries/LC/names.js'
import { names as mxNames } from './countries/MX/names.js'
import { names as niNames } from './countries/NI/names.js'
import { names as paNames } from './countries/PA/names.js'
import { names as svNames } from './countries/SV/names.js'
import { names as ttNames } from './countries/TT/names.js'
import { names as usNames } from './countries/US/names.js'
import { names as vcNames } from './countries/VC/names.js'

export const northAmericaReviewedNames = {
  AG: agNames,
  BB: bbNames,
  BM: bmNames,
  BS: bsNames,
  BZ: bzNames,
  CA: caNames,
  CR: crNames,
  CU: cuNames,
  DM: dmNames,
  DO: doNames,
  GD: gdNames,
  GT: gtNames,
  HN: hnNames,
  HT: htNames,
  JM: jmNames,
  KN: knNames,
  LC: lcNames,
  MX: mxNames,
  NI: niNames,
  PA: paNames,
  SV: svNames,
  TT: ttNames,
  US: usNames,
  VC: vcNames,
} as const

export function isNorthAmericaReviewedCountry(code: string): code is keyof typeof northAmericaReviewedNames {
  return Object.hasOwn(northAmericaReviewedNames, code)
}
