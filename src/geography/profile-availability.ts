import type { Country } from './countries.js'

// Source-backed local samples reviewed for the initial beta; see docs/geographic-data.md.
const reviewedNameCodes = new Set(['AO', 'BF', 'BI', 'BJ', 'BT', 'BW', 'CD', 'CG', 'CI', 'CM', 'CV', 'DZ', 'EG', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'KE', 'LR', 'LS', 'MA', 'MG', 'ML', 'MM', 'MW', 'MZ', 'NA', 'NG', 'RW', 'SC', 'SL', 'SN', 'TG', 'TN', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'])

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
