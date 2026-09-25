import type { City } from './cities.js'

// Each entry is tied to the sampled city. A road name is evidence of a road,
// not evidence that any generated plot or building number exists there.
const streetLines: Record<string, readonly string[]> = {
  'CG:Brazzaville': ['Rue Lékana', 'Rue Likouala', 'Rue Nkéni'],
  'CG:Pointe-Noire': ['Avenue Kaat Matou'],
  'CG:Dolisie': ['Avenue de la République'],
  'CG:Nkayi': ['Avenue de la République'],
  'CG:Impfondo': ['Avenue Denis Sassou Nguesso'],
  'CG:Ouesso': ['Avenue Marien Ngouabi'],
  'CG:Owando': ['Avenue des Écoles'],
  'CG:Sibiti': ['Avenue Secra'],
  'MW:Lilongwe': ['Area 13, Presidential Way', 'Area 10, Chayamba Road', 'Area 4, Mzimba Street'],
}

export function hasReviewedStreet(city: City): boolean {
  return Boolean(streetLines[`${city.country}:${city.name}`]?.length)
}

export function streetLineForCity(city: City, key: string): string | null {
  const lines = streetLines[`${city.country}:${city.name}`]
  if (!lines?.length) return null
  const index = Number.parseInt(key.slice(0, 12), 16) % lines.length
  const road = lines[index]
  if (city.country !== 'CG') return road
  const building = Number.parseInt(key.slice(12, 20), 16) % 250 + 1
  return `${building}, ${road}`
}
