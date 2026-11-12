// Reviewed European territory name components from the pinned birth-place report and Faroese statistics.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as axNames } from './countries/AX/names.js'
import { names as dkNames } from './countries/DK/names.js'
import { names as foNames } from './countries/FO/names.js'
import { names as ggNames } from './countries/GG/names.js'
import { names as giNames } from './countries/GI/names.js'
import { names as imNames } from './countries/IM/names.js'
import { names as jeNames } from './countries/JE/names.js'

export const europeIslandNames = {
  AX: axNames,
  DK: dkNames,
  FO: foNames,
  GG: ggNames,
  GI: giNames,
  IM: imNames,
  JE: jeNames,
} as const

export function isEuropeIslandCountry(code: string): code is keyof typeof europeIslandNames {
  return Object.hasOwn(europeIslandNames, code)
}
