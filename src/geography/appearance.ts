export const appearanceCategories = [
  'west-african',
  'central-african',
  'east-african',
  'southern-african',
  'north-african',
  'black',
  'middle-eastern',
  'european',
  'south-asian',
  'east-asian',
  'southeast-asian',
  'pacific-islander',
  'latin-american',
  'mixed',
] as const

export type Appearance = (typeof appearanceCategories)[number]

export function isAppearance(value: string): value is Appearance {
  return (appearanceCategories as readonly string[]).includes(value)
}
