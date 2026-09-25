import { createHash, randomBytes } from 'node:crypto'
import type { PeopleQuery } from './people-query.js'

export interface DataVersions {
  dataVersion: string
  catalogVersion: string
}

const generationVersion = 'v3'

function digest(parts: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

function generationInputs(query: PeopleQuery, versions: DataVersions, requestSeed: string) {
  return [
    generationVersion,
    requestSeed,
    query.asOf,
    versions.dataVersion,
    versions.catalogVersion,
    query.gender ?? null,
    query.age ?? null,
    query.ageGroup ?? null,
    query.appearance ?? null,
    query.country ?? null,
    query.city ?? null,
  ]
}

export function createGenerationContext(
  query: PeopleQuery,
  versions: DataVersions,
  freshEntropy: () => string = () => randomBytes(16).toString('hex'),
) {
  const requestSeed = query.seed ?? freshEntropy()
  const inputs = generationInputs(query, versions, requestSeed)

  return {
    componentKey(personIndex: number, component: string): string {
      if (!Number.isSafeInteger(personIndex) || personIndex < 0 || !/^[a-z][a-z0-9-]*$/.test(component)) {
        throw new RangeError('Invalid generation component')
      }
      return digest(['persona-component', ...inputs, personIndex, component])
    },
  }
}

export function responseETag(query: PeopleQuery, versions: DataVersions): string {
  if (query.seed === undefined) {
    throw new RangeError('An unseeded response has no replay validator')
  }
  const fingerprint = digest([
    'persona-response',
    ...generationInputs(query, versions, query.seed),
    query.count,
    query.fields ?? null,
  ])
  return `"persona-${generationVersion}-${fingerprint}"`
}
