import type { Person } from '../contracts/person.js'
import { appearanceCategories, isAppearance, type Appearance } from '../geography/appearance.js'

type PortraitProfile = Pick<Person, 'ageGroup' | 'gender' | 'appearance'>

export interface PortraitAsset {
  id: string
  objectKey: string
  catalogVersion: string
  ageGroup: Person['ageGroup']
  gender: Person['gender']
  visualGroup: string
  appearance: Appearance
  rights: string
  sha256: string
  reviewStatus: 'approved' | 'rejected' | 'withdrawn'
}

export interface PortraitCatalog {
  version: string
  publicBaseUrl: string | null
  assets: readonly PortraitAsset[]
}

export const minimumApprovedPortraits = 2

export function validatePortraitCatalog(catalog: PortraitCatalog): string[] {
  const errors: string[] = []
  if (!/^[a-z][a-z0-9-]*$/.test(catalog.version)) errors.push('Invalid catalog version')
  if (catalog.publicBaseUrl !== null) {
    try {
      const url = new URL(catalog.publicBaseUrl)
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        errors.push('Invalid public base URL')
      }
    } catch { errors.push('Invalid public base URL') }
  }
  const ids = new Set<string>()
  const keys = new Set<string>()
  const hashes = new Set<string>()
  for (const asset of catalog.assets) {
    if (!/^p_\d{4,}$/.test(asset.id) || ids.has(asset.id)) errors.push(`Invalid or duplicate portrait ID ${asset.id}`)
    ids.add(asset.id)
    const expectedKey = `portraits/${catalog.version}/${asset.ageGroup}/${asset.gender}/${asset.visualGroup}/${asset.appearance}/${asset.id}.webp`
    if (asset.objectKey !== expectedKey || keys.has(asset.objectKey)) errors.push(`Invalid or duplicate portrait key ${asset.id}`)
    keys.add(asset.objectKey)
    if (asset.catalogVersion !== catalog.version || !['child', 'teen', 'adult', 'senior'].includes(asset.ageGroup)
      || !['male', 'female'].includes(asset.gender) || !/^[a-z]+(?:-[a-z]+)*$/.test(asset.visualGroup)
      || !isAppearance(asset.appearance) || !asset.rights.trim()
      || !['approved', 'rejected', 'withdrawn'].includes(asset.reviewStatus)) {
      errors.push(`Invalid portrait metadata ${asset.id}`)
    }
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || hashes.has(asset.sha256)) errors.push(`Invalid or duplicate portrait hash ${asset.id}`)
    hashes.add(asset.sha256)
  }
  if (catalog.assets.some((asset) => asset.reviewStatus === 'approved') && catalog.publicBaseUrl === null) {
    errors.push('Approved portraits require a public base URL')
  }
  return errors
}

function compatible(catalog: PortraitCatalog, profile: PortraitProfile) {
  return catalog.assets.filter((asset) => asset.reviewStatus === 'approved'
    && asset.ageGroup === profile.ageGroup && asset.gender === profile.gender
    && asset.appearance === profile.appearance)
}

export function portraitCoverage(catalog: PortraitCatalog, profile: PortraitProfile) {
  const approved = compatible(catalog, profile).length
  return { approved, minimum: minimumApprovedPortraits, ready: approved >= minimumApprovedPortraits }
}

export function portraitCoverageMatrix(catalog: PortraitCatalog) {
  const rows = []
  for (const ageGroup of ['child', 'teen', 'adult', 'senior'] as const) {
    for (const gender of ['female', 'male'] as const) {
      for (const appearance of appearanceCategories) {
        const profile = { ageGroup, gender, appearance }
        rows.push({ ...profile, ...portraitCoverage(catalog, profile) })
      }
    }
  }
  return rows
}

export function selectPortrait(
  catalog: PortraitCatalog,
  profile: PortraitProfile,
  key: string,
  usedIds?: Set<string>,
): Person['picture'] {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid portrait key')
  if (catalog.publicBaseUrl === null) return null
  const candidates = compatible(catalog, profile)
  if (!candidates.length) return null
  const unused = usedIds === undefined ? candidates : candidates.filter((asset) => !usedIds.has(asset.id))
  const choices = unused.length ? unused : candidates
  const asset = choices[Number.parseInt(key.slice(0, 12), 16) % choices.length]
  usedIds?.add(asset.id)
  return { url: `${catalog.publicBaseUrl}/${asset.objectKey}` }
}
