import { createHash, randomBytes } from 'node:crypto'
import type { PeopleQuery } from './people-query.js'
import { portraitSelectionVersion } from './portraits/contexts.js'

export interface DataVersions {
  dataVersion: string
  catalogVersion: string
  portraitSelectionVersion?: string
}

const generationVersion = 'v5'

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
    query.ageGroup ?? null,
    query.nationality ?? null,
    query.residenceCountry ?? null,
    query.nationality === undefined ? query.continent ?? null : null,
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
      const selected = query.portraitContexts ?? query.portraitContext
      const scope = selected !== undefined && selected !== 'standard'
        && (component === 'age' || component === 'portrait')
        ? [selected, versions.portraitSelectionVersion ?? portraitSelectionVersion] : []
      return digest(['persona-component', ...inputs, personIndex, component, ...scope])
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
    'urn:persona:schema:public-person:v2',
    query.count,
    query.fields ?? null,
    query.emailDomain ?? 'example.test',
    query.portraitContexts ?? query.portraitContext ?? 'standard',
    versions.portraitSelectionVersion ?? portraitSelectionVersion,
  ])
  return `"persona-${generationVersion}-${fingerprint}"`
}
