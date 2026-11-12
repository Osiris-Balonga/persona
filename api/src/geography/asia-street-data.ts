import type { City } from './cities.js'
import { asiaReviewedNames, isAsiaReviewedCountry } from './asia-reviewed-names.js'
import { asiaWestNames, isAsiaWestCountry } from './asia-west-names.js'
import { asiaEastNames, isAsiaEastCountry } from './asia-east-names.js'
import { asiaCentralNames, isAsiaCentralCountry } from './asia-central-names.js'
import { asiaAdditionalNames, isAsiaAdditionalCountry } from './asia-additional-names.js'
import { drawStreet } from './street-random.js'

type Style = 'armenian' | 'southAsian' | 'georgian' | 'hebrew' | 'iranian'
  | 'sriLankan' | 'nepali' | 'filipino' | 'pakistani' | 'turkish'
  | 'arabic' | 'chinese' | 'hongKong' | 'japanese' | 'korean' | 'northKorean'
  | 'taiwanese' | 'vietnamese' | 'azerbaijani' | 'centralAsian'
  | 'indonesian' | 'singaporean' | 'thai' | 'maldivian' | 'bhutanese' | 'myanmar'

// Street vocabulary is country-level; city and verified postcode still come from their own catalogs.
const asianStreetStyles: Record<string, Style> = {
  AM: 'armenian', BD: 'southAsian', GE: 'georgian', IL: 'hebrew', IN: 'southAsian',
  IR: 'iranian', LK: 'sriLankan', NP: 'nepali', PH: 'filipino', PK: 'pakistani',
  TR: 'turkish', AE: 'arabic', AF: 'arabic', BH: 'arabic', IQ: 'arabic',
  JO: 'arabic', KW: 'arabic', LB: 'arabic', PS: 'arabic', SA: 'arabic',
  SY: 'arabic', YE: 'arabic', CN: 'chinese', HK: 'hongKong', JP: 'japanese',
  KP: 'northKorean', KR: 'korean', TW: 'taiwanese', VN: 'vietnamese',
  AZ: 'azerbaijani', KG: 'centralAsian', KZ: 'centralAsian', UZ: 'centralAsian',
  ID: 'indonesian', SG: 'singaporean', TH: 'thai', MV: 'maldivian', QA: 'arabic',
  BT: 'bhutanese', MM: 'myanmar',
}

// Small project-owned place-word sets avoid implying inherited surnames where a person-based
// street label would be especially awkward. They are naming ingredients, not known roads.
const placeRoots: Partial<Record<Style, readonly string[]>> = {
  chinese: ['Huayuan', 'Xinhua', 'Qinghe', 'Dongyuan', 'Yulan', 'Jinhe', 'Mingyuan', 'Linhua', 'Nanhe', 'Yunshan', 'Haiyuan', 'Wenhua'],
  hongKong: ['Ming Wah', 'Pak Lam', 'Hoi Yuen', 'Ching Tak', 'Wing Shan', 'Lok Yuen', 'Yat Hing', 'Tak Shing', 'Hoi Nam', 'Kam Yuen', 'Tung Yuen', 'Po Lam'],
  japanese: ['Aoba', 'Sakura', 'Midorigaoka', 'Asahi', 'Higashi', 'Wakaba', 'Hibari', 'Shinmachi', 'Hanazono', 'Yamabuki', 'Nishiki', 'Kasuga'],
  korean: ['Namsan', 'Cheongha', 'Baekun', 'Haneul', 'Solbit', 'Donghae', 'Seongmun', 'Mirae', 'Eunha', 'Haesol', 'Bomnae', 'Darae'],
  northKorean: ['Mirae', 'Chollima', 'Taedong', 'Ryonggang', 'Kwangbok', 'Songhwa', 'Rungna', 'Saebom', 'Moran', 'Pothong', 'Jangmi', 'Namsan'],
  taiwanese: ['Qinghe', 'Wenhua', 'Mingde', 'Zhongyuan', 'Yonghe', 'Fuxing', 'Jinghua', 'Xinmin', 'Huayuan', 'Guangming', 'Heping', 'Linsen'],
  thai: ['Rung Arun', 'Dok Mai', 'Siri Chai', 'Ban Mai', 'Suk Jai', 'Saeng Dao', 'Chom Dao', 'Rom Yen', 'Suan Mai', 'Chai Mongkhon', 'Rim Nam', 'Khao Thong'],
  bhutanese: ['Tashi', 'Pema', 'Norbu', 'Druk', 'Karma', 'Sonam', 'Choden', 'Deki', 'Wangmo', 'Jigme', 'Chimi', 'Dorji'],
  myanmar: ['Thiri', 'Mya', 'Padauk', 'Yadanar', 'Aung', 'Shwe', 'Zayar', 'Pyi', 'Hnin', 'Mingalar', 'Nandar', 'Pan'],
}

export function hasSyntheticAsianStreet(country: string): boolean {
  return Object.hasOwn(asianStreetStyles, country)
}

function nameParts(country: string, key: string): { family: string; given: string } | null {
  if (isAsiaCentralCountry(country)) {
    const pool = asiaCentralNames[country]
    return {
      family: pool.familyMale[drawStreet(key, `street-name:${country}`, pool.familyMale.length)],
      given: pool.male[drawStreet(key, `street-given:${country}`, pool.male.length)],
    }
  }
  const pool = isAsiaReviewedCountry(country) ? asiaReviewedNames[country]
    : isAsiaWestCountry(country) ? asiaWestNames[country]
      : isAsiaEastCountry(country) ? asiaEastNames[country]
        : isAsiaAdditionalCountry(country) ? asiaAdditionalNames[country] : null
  if (!pool) return null
  return {
    family: pool.family[drawStreet(key, `street-name:${country}`, pool.family.length)],
    given: pool.male[drawStreet(key, `street-given:${country}`, pool.male.length)],
  }
}

function streetLabel(style: Style, country: string, person: string, family: string, given: string, key: string): string {
  const roots = placeRoots[style]
  if (roots) return roots[drawStreet(key, `street-root:${country}`, roots.length)]
  if (style === 'vietnamese') return `${family} ${given}`
  if (style === 'arabic') return given
  return person
}

function render(style: Style, label: string, variant: number, number: number, key: string): string {
  switch (style) {
    case 'armenian': return `${label} ${['Street', 'Avenue', 'Lane'][variant]} ${number}`
    case 'southAsian': return `${number} ${label} ${['Road', 'Marg', 'Lane'][variant]}`
    case 'georgian': return `${number} ${label} ${['Street', 'Avenue', 'Lane'][variant]}`
    case 'hebrew': return `${number} ${label} ${['Street', 'Road', 'Avenue'][variant]}`
    case 'iranian': return `${number} ${label} ${['Street', 'Boulevard', 'Alley'][variant]}`
    case 'sriLankan': return `${number} ${label} ${['Mawatha', 'Road', 'Lane'][variant]}`
    case 'nepali': return `${number} ${label} ${['Marg', 'Road', 'Tole'][variant]}`
    case 'filipino': return `${number} ${label} ${['Street', 'Avenue', 'Road'][variant]}`
    case 'pakistani': return `${number} ${label} ${['Road', 'Street', 'Lane'][variant]}`
    case 'turkish': return `${label} ${['Sokak', 'Caddesi', 'Bulvarı'][variant]} No: ${number}`
    case 'arabic': return `${number} ${label} ${['Street', 'Road', 'Avenue'][variant]}`
    case 'chinese': return `${number} ${label} ${['Lu', 'Jie', 'Dadao'][variant]}`
    case 'hongKong': return `${number} ${label} ${['Road', 'Street', 'Lane'][variant]}`
    case 'japanese': {
      const block = drawStreet(key, 'jp-block', 8) + 1
      return `${label} ${variant + 1}-Chome ${block}-${number}`
    }
    case 'korean': return `${number} ${label}-${['ro', 'gil', 'daero'][variant]}`
    case 'northKorean': return `${number} ${label} ${variant === 1 ? 'Avenue' : 'Street'}`
    case 'taiwanese': return `No. ${number}, ${label} ${['Road', 'Street', 'Lane'][variant]}`
    case 'vietnamese': return `${number} Đường ${label}`
    case 'azerbaijani': return `${label} ${['küçəsi', 'prospekti', 'döngəsi'][variant]} ${number}`
    case 'centralAsian': return `${number} ${label} ${['Street', 'Avenue', 'Lane'][variant]}`
    case 'indonesian': return `Jl. ${label} No. ${number}`
    case 'singaporean': return `${number} ${label} ${['Road', 'Street', 'Avenue'][variant]}`
    case 'thai': return `${number} ${variant === 1 ? 'Soi' : 'Thanon'} ${label}`
    case 'maldivian': return `${label} ${['Magu', 'Hingun', 'Goalhi'][variant]}, ${number}`
    case 'bhutanese': return `${number} ${label} Lam`
    case 'myanmar': return `${number} ${label} ${variant === 1 ? 'Lan' : 'Road'}`
  }
}

export function asianStreetLineForCity(city: City, key: string): string | null {
  const style = asianStreetStyles[city.country]
  if (!style) return null
  const parts = nameParts(city.country, key)
  if (!parts && !placeRoots[style]) return null
  const family = parts?.family ?? ''
  const given = parts?.given ?? ''
  const person = drawStreet(key, `street-person:${city.country}`, 3) === 0 || given === family
    ? family : `${given} ${family}`
  const label = streetLabel(style, city.country, person, family, given, key)
  const variant = drawStreet(key, `street-form:${city.country}`, 3)
  const number = drawStreet(key, `building:${city.country}`, 240) + 1
  return render(style, label, variant, number, key)
}
