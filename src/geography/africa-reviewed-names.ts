// Source-backed local name components; coverage and limits in docs/geographic-data.md.
// Edit country datasets in countries/<ISO>/names.ts; this registry preserves existing consumers.
import { names as aoNames } from './countries/AO/names.js'
import { names as bfNames } from './countries/BF/names.js'
import { names as biNames } from './countries/BI/names.js'
import { names as bjNames } from './countries/BJ/names.js'
import { names as bwNames } from './countries/BW/names.js'
import { names as cdNames } from './countries/CD/names.js'
import { names as cfNames } from './countries/CF/names.js'
import { names as cgNames } from './countries/CG/names.js'
import { names as ciNames } from './countries/CI/names.js'
import { names as cmNames } from './countries/CM/names.js'
import { names as cvNames } from './countries/CV/names.js'
import { names as dzNames } from './countries/DZ/names.js'
import { names as egNames } from './countries/EG/names.js'
import { names as gaNames } from './countries/GA/names.js'
import { names as ghNames } from './countries/GH/names.js'
import { names as gmNames } from './countries/GM/names.js'
import { names as gnNames } from './countries/GN/names.js'
import { names as gqNames } from './countries/GQ/names.js'
import { names as keNames } from './countries/KE/names.js'
import { names as lrNames } from './countries/LR/names.js'
import { names as lsNames } from './countries/LS/names.js'
import { names as lyNames } from './countries/LY/names.js'
import { names as maNames } from './countries/MA/names.js'
import { names as mgNames } from './countries/MG/names.js'
import { names as mlNames } from './countries/ML/names.js'
import { names as muNames } from './countries/MU/names.js'
import { names as mzNames } from './countries/MZ/names.js'
import { names as ngNames } from './countries/NG/names.js'
import { names as naNames } from './countries/NA/names.js'
import { names as reNames } from './countries/RE/names.js'
import { names as rwNames } from './countries/RW/names.js'
import { names as scNames } from './countries/SC/names.js'
import { names as sdNames } from './countries/SD/names.js'
import { names as slNames } from './countries/SL/names.js'
import { names as snNames } from './countries/SN/names.js'
import { names as soNames } from './countries/SO/names.js'
import { names as ssNames } from './countries/SS/names.js'
import { names as tgNames } from './countries/TG/names.js'
import { names as tnNames } from './countries/TN/names.js'
import { names as tzNames } from './countries/TZ/names.js'
import { names as ugNames } from './countries/UG/names.js'
import { names as ytNames } from './countries/YT/names.js'
import { names as zaNames } from './countries/ZA/names.js'
import { names as zmNames } from './countries/ZM/names.js'
import { names as zwNames } from './countries/ZW/names.js'
import { names as djNames } from './countries/DJ/names.js'
import { names as erNames } from './countries/ER/names.js'
import { names as gwNames } from './countries/GW/names.js'
import { names as kmNames } from './countries/KM/names.js'
import { names as mrNames } from './countries/MR/names.js'
import { names as neNames } from './countries/NE/names.js'
import { names as stNames } from './countries/ST/names.js'
import { names as szNames } from './countries/SZ/names.js'
import { names as tdNames } from './countries/TD/names.js'
import { names as shNames } from './countries/SH/names.js'
import { names as ehNames } from './countries/EH/names.js'

export const africaReviewedNames = {
  AO: aoNames,
  BF: bfNames,
  BI: biNames,
  BJ: bjNames,
  BW: bwNames,
  CD: cdNames,
  CF: cfNames,
  CG: cgNames,
  CI: ciNames,
  CM: cmNames,
  CV: cvNames,
  DZ: dzNames,
  EG: egNames,
  GA: gaNames,
  GH: ghNames,
  GM: gmNames,
  GN: gnNames,
  GQ: gqNames,
  KE: keNames,
  LR: lrNames,
  LS: lsNames,
  LY: lyNames,
  MA: maNames,
  MG: mgNames,
  ML: mlNames,
  MU: muNames,
  MZ: mzNames,
  NG: ngNames,
  NA: naNames,
  RE: reNames,
  RW: rwNames,
  SC: scNames,
  SD: sdNames,
  SL: slNames,
  SN: snNames,
  SO: soNames,
  SS: ssNames,
  TG: tgNames,
  TN: tnNames,
  TZ: tzNames,
  UG: ugNames,
  YT: ytNames,
  ZA: zaNames,
  ZM: zmNames,
  ZW: zwNames,
  DJ: djNames,
  ER: erNames,
  GW: gwNames,
  KM: kmNames,
  MR: mrNames,
  NE: neNames,
  ST: stNames,
  SZ: szNames,
  TD: tdNames,
  SH: shNames,
  EH: ehNames,
} as const

export function isAfricaReviewedCountry(code: string): code is keyof typeof africaReviewedNames {
  return Object.hasOwn(africaReviewedNames, code)
}
