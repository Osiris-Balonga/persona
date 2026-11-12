import { isAppearance, type Appearance } from '../geography/appearance.js'

// Editorial visual compatibility labels. They never assert a person's ancestry or nationality.
export const appearanceTags = [
  'black', 'european', 'north-african', 'middle-eastern', 'south-asian',
  'east-asian', 'southeast-asian', 'pacific-islander', 'indigenous-american',
] as const

export type AppearanceTag = (typeof appearanceTags)[number]

export function areAppearanceTags(value: unknown): value is AppearanceTag[] {
  return Array.isArray(value) && value.length > 0 && value.length <= appearanceTags.length
    && new Set(value).size === value.length
    && value.every((tag) => appearanceTags.includes(tag))
}

const contextTags: Record<Exclude<Appearance, 'mixed'>, readonly AppearanceTag[]> = {
  'west-african': ['black'], 'central-african': ['black'], 'east-african': ['black'],
  'southern-african': ['black'], 'north-african': ['north-african'],
  black: ['black'], 'middle-eastern': ['middle-eastern'], european: ['european'],
  'south-asian': ['south-asian'], 'east-asian': ['east-asian'],
  'southeast-asian': ['southeast-asian'], 'pacific-islander': ['pacific-islander'],
  'latin-american': ['black', 'european', 'indigenous-american'],
}

export function tagsMatchAppearance(tags: readonly AppearanceTag[], appearance: string): boolean {
  if (!isAppearance(appearance)) return false
  if (appearance === 'mixed') return false
  return contextTags[appearance].some((tag) => tags.includes(tag))
}
