import type { Country } from './countries.js'

// Source-backed local samples reviewed for the initial beta; see docs/geographic-data.md.
const reviewedNameCodes = new Set(['AO', 'BF', 'BI', 'BJ', 'BT', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DZ', 'EG', 'EH', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG', 'ML', 'MM', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SC', 'SD', 'SH', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TN', 'TZ', 'UG', 'YT', 'ZA', 'ZM', 'ZW'])

export function hasReviewedNamePool(code: string): boolean {
  return reviewedNameCodes.has(code)
}

export function profileGenerationStatus(country: Country): 'available' | 'pending-name-review' | 'unavailable' {
  if (country.generation === 'unavailable') return 'unavailable'
  return hasReviewedNamePool(country.code) ? 'available' : 'pending-name-review'
}

export function canGenerateProfile(country: Country): boolean {
  return profileGenerationStatus(country) === 'available'
}
