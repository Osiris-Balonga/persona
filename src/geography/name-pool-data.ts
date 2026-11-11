// GeoNames countryInfo.txt (CC BY 4.0), @faker-js/faker 10.6.0 (MIT), and reviewed Georgian given-name statistics; see docs/geographic-data.md.
import { names as af_ZA } from './name-pools/af_ZA.js'
import { names as ar } from './name-pools/ar.js'
import { names as az } from './name-pools/az.js'
import { names as cs_CZ } from './name-pools/cs_CZ.js'
import { names as da } from './name-pools/da.js'
import { names as de } from './name-pools/de.js'
import { names as de_AT } from './name-pools/de_AT.js'
import { names as de_CH } from './name-pools/de_CH.js'
import { names as dv } from './name-pools/dv.js'
import { names as el } from './name-pools/el.js'
import { names as en } from './name-pools/en.js'
import { names as en_AU } from './name-pools/en_AU.js'
import { names as en_GH } from './name-pools/en_GH.js'
import { names as en_IN } from './name-pools/en_IN.js'
import { names as en_NG } from './name-pools/en_NG.js'
import { names as en_ZA } from './name-pools/en_ZA.js'
import { names as es } from './name-pools/es.js'
import { names as es_MX } from './name-pools/es_MX.js'
import { names as fa } from './name-pools/fa.js'
import { names as fi } from './name-pools/fi.js'
import { names as fr } from './name-pools/fr.js'
import { names as fr_BE } from './name-pools/fr_BE.js'
import { names as fr_CH } from './name-pools/fr_CH.js'
import { names as fr_SN } from './name-pools/fr_SN.js'
import { names as he } from './name-pools/he.js'
import { names as hr } from './name-pools/hr.js'
import { names as hu } from './name-pools/hu.js'
import { names as hy } from './name-pools/hy.js'
import { names as id_ID } from './name-pools/id_ID.js'
import { names as it } from './name-pools/it.js'
import { names as ja } from './name-pools/ja.js'
import { names as ka_GE } from './name-pools/ka_GE.js'
import { names as ko } from './name-pools/ko.js'
import { names as lv } from './name-pools/lv.js'
import { names as mk } from './name-pools/mk.js'
import { names as nb_NO } from './name-pools/nb_NO.js'
import { names as ne } from './name-pools/ne.js'
import { names as nl } from './name-pools/nl.js'
import { names as nl_BE } from './name-pools/nl_BE.js'
import { names as pl } from './name-pools/pl.js'
import { names as pt_BR } from './name-pools/pt_BR.js'
import { names as pt_PT } from './name-pools/pt_PT.js'
import { names as ro } from './name-pools/ro.js'
import { names as ru } from './name-pools/ru.js'
import { names as sk } from './name-pools/sk.js'
import { names as sl_SI } from './name-pools/sl_SI.js'
import { names as sr_RS_latin } from './name-pools/sr_RS_latin.js'
import { names as sv } from './name-pools/sv.js'
import { names as th } from './name-pools/th.js'
import { names as tr } from './name-pools/tr.js'
import { names as uk } from './name-pools/uk.js'
import { names as ur } from './name-pools/ur.js'
import { names as uz_UZ_latin } from './name-pools/uz_UZ_latin.js'
import { names as vi } from './name-pools/vi.js'
import { names as yo_NG } from './name-pools/yo_NG.js'
import { names as zh_CN } from './name-pools/zh_CN.js'
import { names as zh_TW } from './name-pools/zh_TW.js'
import { names as zu_ZA } from './name-pools/zu_ZA.js'

export type NamePool = { female: readonly string[]; male: readonly string[]; lastFemale: readonly string[]; lastMale: readonly string[] }

export const namePoolData: Record<string, NamePool> = {
  af_ZA,
  ar,
  az,
  cs_CZ,
  da,
  de,
  de_AT,
  de_CH,
  dv,
  el,
  en,
  en_AU,
  en_GH,
  en_IN,
  en_NG,
  en_ZA,
  es,
  es_MX,
  fa,
  fi,
  fr,
  fr_BE,
  fr_CH,
  fr_SN,
  he,
  hr,
  hu,
  hy,
  id_ID,
  it,
  ja,
  ka_GE,
  ko,
  lv,
  mk,
  nb_NO,
  ne,
  nl,
  nl_BE,
  pl,
  pt_BR,
  pt_PT,
  ro,
  ru,
  sk,
  sl_SI,
  sr_RS_latin,
  sv,
  th,
  tr,
  uk,
  ur,
  uz_UZ_latin,
  vi,
  yo_NG,
  zh_CN,
  zh_TW,
  zu_ZA,
}
