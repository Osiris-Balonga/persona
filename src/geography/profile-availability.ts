import type { Country } from './countries.js'
import { resolveNameProvider } from './name-providers.js'

export function hasReviewedNamePool(code: string): boolean {
  return resolveNameProvider(code)?.reviewed ?? false
}

export function profileGenerationStatus(country: Country): 'available' | 'pending-name-review' | 'unavailable' {
  if (country.generation === 'unavailable') return 'unavailable'
  return hasReviewedNamePool(country.code) ? 'available' : 'pending-name-review'
}

export function canGenerateProfile(country: Country): boolean {
  return profileGenerationStatus(country) === 'available'
}
