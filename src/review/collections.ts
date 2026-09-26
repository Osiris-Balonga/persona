// Editorial production batches. A collection records the brief used to make an image,
// not a nationality or an appearance inferred from a face.
export const portraitCollections = {
  americas: ['americas-north', 'americas-latin-caribbean'],
  europe: ['europe-north', 'europe-west', 'europe-south', 'europe-east'],
  oceania: ['oceania-australia-new-zealand', 'oceania-pacific-islands'],
} as const

export const portraitCollectionOptions = [
  ...portraitCollections.americas,
  ...portraitCollections.europe,
  'europe-unassigned',
  ...portraitCollections.oceania,
] as const

export type PortraitCollection = (typeof portraitCollectionOptions)[number]

export function isPortraitCollection(value: unknown): value is PortraitCollection {
  return typeof value === 'string' && (portraitCollectionOptions as readonly string[]).includes(value)
}
