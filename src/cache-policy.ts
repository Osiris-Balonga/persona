import type { PeopleQuery } from './people-query.js'
import { responseETag, type DataVersions } from './replay.js'

export function peopleCacheHeaders(
  statusCode: number,
  query: PeopleQuery,
  explicitAsOf: boolean,
  versions: DataVersions,
): { 'Cache-Control': string; ETag?: string } {
  if (statusCode !== 200 || query.seed === undefined || !explicitAsOf) {
    return { 'Cache-Control': 'no-store' }
  }

  return {
    'Cache-Control': 'private, no-cache',
    ETag: responseETag(query, versions),
  }
}
