import type { Person } from '../contracts/person.js'
import { ageGroupForAge } from '../age.js'
import { m49RegionByCountry } from '../geography/m49-region-data.js'
import type { PortraitCollection } from '../review/collections.js'
import type { PortraitCatalog } from './catalog.js'
import { contextAllowsAge, portraitContextWeights, type PortraitContext } from './contexts.js'

const islandCountries = new Set(['KM', 'MG', 'MU', 'RE', 'SC', 'YT'])

// Geographic production brief, not a claim about an individual's ancestry.
export function collectionForCountry(country: string): PortraitCollection | null {
  if (islandCountries.has(country)) return 'africa-indian-ocean'
  const [continent, region, subregion] = m49RegionByCountry[country] ?? []
  if (continent === '002') return ({
    '015': 'africa-north', '011': 'africa-west', '017': 'africa-central',
    '014': 'africa-east', '018': 'africa-south',
  } as Record<string, PortraitCollection>)[subregion || region] ?? null
  if (continent === '142') return ({
    '030': 'asia-east', '035': 'asia-southeast', '034': 'asia-south', '143': 'asia-central',
    '145': 'asia-middle-east',
  } as Record<string, PortraitCollection>)[region] ?? null
  if (continent === '019') return region === '021' ? 'americas-north' : 'americas-latin-caribbean'
  if (continent === '150') return ({
    '154': 'europe-north', '155': 'europe-west', '039': 'europe-south', '151': 'europe-east',
  } as Record<string, PortraitCollection>)[region] ?? null
  if (continent === '009') return region === '053' ? 'oceania-australia-new-zealand' : 'oceania-pacific-islands'
  return null
}

export function selectPortraitFromCollection(
  catalog: PortraitCatalog,
  profile: Pick<Person, 'age' | 'ageGroup' | 'gender'>,
  country: string,
  key: string,
  usedIds?: Set<string>,
  portraitContext: PortraitContext | readonly PortraitContext[] = 'standard',
  skinTone?: number | readonly number[],
): Person['picture'] {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid portrait key')
  const collection = collectionForCountry(country)
  const isSingleContext = typeof portraitContext === 'string'
  const contexts = isSingleContext ? [portraitContext] : portraitContext
  if (!collection || !catalog.publicBaseUrl || ageGroupForAge(profile.age) !== profile.ageGroup
    || !contexts.some(context => contextAllowsAge(context, profile.age))) return null
  const tones = skinTone === undefined ? undefined : typeof skinTone === 'number' ? [skinTone] : skinTone
  const matchingAssets = catalog.assets.filter((asset) => asset.reviewStatus === 'approved'
    && (tones === undefined || (asset.skinToneMst !== undefined && tones.includes(asset.skinToneMst)))
    && contexts.includes(asset.portraitContext ?? 'standard')
    && contextAllowsAge(asset.portraitContext ?? 'standard', profile.age)
    && asset.collection === collection && asset.gender === profile.gender
    && asset.apparentAgeRanges.some(([minimum, maximum]) => profile.age >= minimum && profile.age <= maximum))
  if (!matchingAssets.length) return null
  // A singular exact context retains the original selector and key segment.
  let selectedContext: PortraitContext | undefined
  if (isSingleContext) {
    selectedContext = portraitContext
  } else {
    const availableContexts = contexts.filter(context => matchingAssets.some(asset => (asset.portraitContext ?? 'standard') === context))
    const totalWeight = availableContexts.reduce((total, context) => total + portraitContextWeights[context], 0)
    const draw = Number.parseInt(key.slice(12, 24), 16) % totalWeight
    let cumulative = 0
    selectedContext = availableContexts.find(context => {
      cumulative += portraitContextWeights[context]
      return draw < cumulative
    })
  }
  if (!selectedContext) return null
  const candidates = matchingAssets.filter(asset => (asset.portraitContext ?? 'standard') === selectedContext)
  const unused = usedIds === undefined ? candidates : candidates.filter((asset) => !usedIds.has(asset.id))
  const choices = unused.length ? unused : candidates
  const asset = choices[Number.parseInt(key.slice(0, 12), 16) % choices.length]
  usedIds?.add(asset.id)
  return { url: `${catalog.publicBaseUrl}/${asset.objectKey}` }
}
