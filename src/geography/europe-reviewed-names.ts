// Reviewed Latin-script name components from the pinned Europe candidate snapshot; see docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as adNames } from './countries/AD/names.js'
import { names as alNames } from './countries/AL/names.js'
import { names as atNames } from './countries/AT/names.js'
import { names as baNames } from './countries/BA/names.js'
import { names as beNames } from './countries/BE/names.js'
import { names as chNames } from './countries/CH/names.js'
import { names as deNames } from './countries/DE/names.js'
import { names as eeNames } from './countries/EE/names.js'
import { names as esNames } from './countries/ES/names.js'
import { names as fiNames } from './countries/FI/names.js'
import { names as frNames } from './countries/FR/names.js'
import { names as gbNames } from './countries/GB/names.js'
import { names as hrNames } from './countries/HR/names.js'
import { names as huNames } from './countries/HU/names.js'
import { names as ieNames } from './countries/IE/names.js'
import { names as itNames } from './countries/IT/names.js'
import { names as liNames } from './countries/LI/names.js'
import { names as luNames } from './countries/LU/names.js'
import { names as mcNames } from './countries/MC/names.js'
import { names as mdNames } from './countries/MD/names.js'
import { names as meNames } from './countries/ME/names.js'
import { names as mtNames } from './countries/MT/names.js'
import { names as nlNames } from './countries/NL/names.js'
import { names as noNames } from './countries/NO/names.js'
import { names as ptNames } from './countries/PT/names.js'
import { names as roNames } from './countries/RO/names.js'
import { names as rsNames } from './countries/RS/names.js'
import { names as seNames } from './countries/SE/names.js'
import { names as siNames } from './countries/SI/names.js'
import { names as smNames } from './countries/SM/names.js'

export const europeReviewedNames = {
  AD: adNames,
  AL: alNames,
  AT: atNames,
  BA: baNames,
  BE: beNames,
  CH: chNames,
  DE: deNames,
  EE: eeNames,
  ES: esNames,
  FI: fiNames,
  FR: frNames,
  GB: gbNames,
  HR: hrNames,
  HU: huNames,
  IE: ieNames,
  IT: itNames,
  LI: liNames,
  LU: luNames,
  MC: mcNames,
  MD: mdNames,
  ME: meNames,
  MT: mtNames,
  NL: nlNames,
  NO: noNames,
  PT: ptNames,
  RO: roNames,
  RS: rsNames,
  SE: seNames,
  SI: siNames,
  SM: smNames,
} as const

export function isEuropeReviewedCountry(code: string): code is keyof typeof europeReviewedNames {
  return Object.hasOwn(europeReviewedNames, code)
}
