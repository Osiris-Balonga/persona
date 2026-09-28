import type { Person } from '../contracts/person.js'
import { appearanceCategories, isAppearance, type Appearance } from '../geography/appearance.js'
import { ageGroupForAge } from '../age.js'
import { areConsecutivePortraitAgeRanges, isPortraitAgeRange, portraitAgeRanges } from '../review/age-ranges.js'
import { areAppearanceTags, tagsMatchAppearance, type AppearanceTag } from './appearance-tags.js'
import { isPortraitCollection, type PortraitCollection } from '../review/collections.js'

type PortraitProfile = Pick<Person, 'age' | 'ageGroup' | 'gender' | 'appearance'>
type PortraitGroup = Pick<Person, 'ageGroup' | 'gender' | 'appearance'>

export type PortraitRendition = { objectKey: string; sha256: string }
export type PortraitVariants = Record<'large' | 'medium' | 'thumbnail', PortraitRendition>
export const portraitVariantSizes = ['large', 'medium', 'thumbnail'] as const

export interface PortraitAsset {
  id: string
  objectKey: string
  catalogVersion: string
  ageGroup: Person['ageGroup']
  apparentAgeRanges: readonly (readonly [number, number])[]
  gender: Person['gender']
  visualGroup: string
  appearance: Appearance
  collection?: PortraitCollection
  compatibleAppearances?: readonly Appearance[]
  appearanceTags?: readonly AppearanceTag[]
  skinToneMst?: number
  rights: string
  sha256: string
  variants?: PortraitVariants
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
    const stableKey = `portraits/${catalog.version}/${asset.id}.webp`
    const canonicalLargeKey = `portraits/${catalog.version}/large/${asset.id}.webp`
    const legacyKey = `portraits/${catalog.version}/${asset.ageGroup}/${asset.gender}/${asset.visualGroup}/${asset.appearance}/${asset.id}.webp`
    if (![stableKey, canonicalLargeKey, legacyKey].includes(asset.objectKey) || keys.has(asset.objectKey)) errors.push(`Invalid or duplicate portrait key ${asset.id}`)
    keys.add(asset.objectKey)
    if (asset.catalogVersion !== catalog.version || !['child', 'teen', 'adult', 'senior'].includes(asset.ageGroup)
      || !['male', 'female'].includes(asset.gender) || !/^[a-z]+(?:-[a-z]+)*$/.test(asset.visualGroup)
      || !isAppearance(asset.appearance) || !asset.rights.trim()
      || !['approved', 'rejected', 'withdrawn'].includes(asset.reviewStatus)) {
      errors.push(`Invalid portrait metadata ${asset.id}`)
    }
    if (asset.skinToneMst !== undefined && (!Number.isInteger(asset.skinToneMst)
      || asset.skinToneMst < 1 || asset.skinToneMst > 10)) errors.push(`Invalid Monk tone ${asset.id}`)
    if (asset.collection !== undefined && !isPortraitCollection(asset.collection)) {
      errors.push(`Invalid portrait collection ${asset.id}`)
    }
    if (asset.compatibleAppearances !== undefined
      && (asset.compatibleAppearances.length === 0
        || !asset.compatibleAppearances.includes(asset.appearance)
        || new Set(asset.compatibleAppearances).size !== asset.compatibleAppearances.length
        || asset.compatibleAppearances.some((value) => !isAppearance(value)))) {
      errors.push(`Invalid compatible appearances ${asset.id}`)
    }
    if (asset.appearanceTags !== undefined && !areAppearanceTags(asset.appearanceTags)) {
      errors.push(`Invalid visual appearance tags ${asset.id}`)
    }
    const ranges = asset.apparentAgeRanges
    if (!areConsecutivePortraitAgeRanges(ranges)
      || !isPortraitAgeRange(asset.ageGroup, ranges[0][0], ranges[0][1])) {
      errors.push(`Invalid portrait age ranges ${asset.id}`)
    }
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || hashes.has(asset.sha256)) errors.push(`Invalid or duplicate portrait hash ${asset.id}`)
    hashes.add(asset.sha256)
    if (asset.variants !== undefined) {
      for (const size of portraitVariantSizes) {
        const rendition = asset.variants[size]
        const expectedKey = `portraits/${catalog.version}/${size}/${asset.id}.webp`
        if (rendition === undefined || rendition.objectKey !== expectedKey
          || (keys.has(expectedKey) && !(size === 'large' && asset.objectKey === expectedKey))
          || !/^[a-f0-9]{64}$/.test(rendition.sha256)) {
          errors.push(`Invalid portrait ${size} variant ${asset.id}`)
        }
        keys.add(expectedKey)
      }
      if (asset.variants.large?.sha256 !== asset.sha256) {
        errors.push(`Large portrait variant must match original ${asset.id}`)
      }
      if (Object.keys(asset.variants).some((size) => !portraitVariantSizes.includes(size as typeof portraitVariantSizes[number]))) {
        errors.push(`Unknown portrait variant ${asset.id}`)
      }
    }
  }
  if (catalog.assets.some((asset) => asset.reviewStatus === 'approved') && catalog.publicBaseUrl === null) {
    errors.push('Approved portraits require a public base URL')
  }
  return errors
}

export function approvedPortraitHash(catalog: PortraitCatalog, key: string): string | undefined {
  for (const asset of catalog.assets) {
    if (asset.reviewStatus !== 'approved') continue
    if (asset.objectKey === key) return asset.sha256
    for (const size of portraitVariantSizes) {
      const variant = asset.variants?.[size]
      if (variant?.objectKey === key) return variant.sha256
    }
  }
  return undefined
}

function compatible(catalog: PortraitCatalog, profile: PortraitProfile) {
  if (ageGroupForAge(profile.age) !== profile.ageGroup) return []
  return catalog.assets.filter((asset) => asset.reviewStatus === 'approved'
    && asset.gender === profile.gender
    && (profile.appearance === 'mixed'
      ? (asset.compatibleAppearances ?? [asset.appearance]).includes('mixed')
      : asset.appearanceTags
        ? tagsMatchAppearance(asset.appearanceTags, profile.appearance)
        : (asset.compatibleAppearances ?? [asset.appearance]).some((value) => value === profile.appearance))
    && asset.apparentAgeRanges.some(([minimum, maximum]) => profile.age >= minimum && profile.age <= maximum))
}

export function portraitCoverage(catalog: PortraitCatalog, profile: PortraitGroup) {
  const ranges = portraitAgeRanges[profile.ageGroup]
  const approved = Math.min(...ranges.flatMap(([minimum, maximum]) =>
    Array.from({ length: maximum - minimum + 1 }, (_, offset) =>
      compatible(catalog, { ...profile, age: minimum + offset }).length)))
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
