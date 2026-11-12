import { createHash, randomBytes } from 'node:crypto'
import { parsePeopleQuery, PeopleQueryError, type PeopleQuery } from './people-query.js'
import { maximumCursorLength, maximumPageLimit, maximumPeopleTotal } from './people-limits.js'
import { generationVersion, type DataVersions } from './replay.js'
import { portraitSelectionVersion } from './portraits/contexts.js'

export interface PeoplePageRequest {
  query: PeopleQuery
  cacheable: boolean
  cursorParameters?: string
}

type Cursor = { v: 1; offset: number; limit: number; parameters: string; fingerprint: string }
const cursorError = () => new PeopleQueryError('INVALID_QUERY', 'cursor',
  'Invalid or incompatible cursor; start a new request with count and limit')

function fingerprint(versions: DataVersions): string {
  return createHash('sha256').update(JSON.stringify(['people-pagination-v1', generationVersion,
    versions.dataVersion, versions.catalogVersion, versions.portraitSelectionVersion ?? portraitSelectionVersion,
    versions.portraitCatalogFingerprint ?? null])).digest('hex')
}

function parametersFor(query: PeopleQuery): string {
  const parameters = new URLSearchParams({ count: String(query.pagination!.total), limit: String(maximumPageLimit),
    seed: query.seed!, asOf: query.asOf })
  for (const field of ['gender', 'nationality', 'residenceCountry', 'city', 'emailDomain', 'portraitContext'] as const) {
    if (query[field] !== undefined) parameters.set(field, query[field])
  }
  if (query.nationality === undefined && query.continent !== undefined) parameters.set('continent', query.continent)
  for (const field of ['ageGroup', 'fields', 'portraitContexts'] as const) {
    if (query[field] !== undefined) parameters.set(field, query[field].join(','))
  }
  if (query.skinTone !== undefined) parameters.set('skinTone', typeof query.skinTone === 'number'
    ? String(query.skinTone) : query.skinTone.join(','))
  parameters.sort()
  const encoded = parameters.toString()
  if (encoded.length > 2048) throw new PeopleQueryError('INVALID_QUERY', 'query', 'Pagination query is too long')
  return encoded
}

function readCursor(token: string, versions: DataVersions): Cursor {
  // This is untrusted public request state, not an authentication credential.
  if (!token || token.length > maximumCursorLength || !/^[A-Za-z0-9_-]+$/.test(token)) throw cursorError()
  try {
    const bytes = Buffer.from(token, 'base64url')
    if (bytes.toString('base64url') !== token) throw cursorError()
    const value = JSON.parse(bytes.toString('utf8')) as Partial<Cursor> | null
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !== 'fingerprint,limit,offset,parameters,v'
      || value.v !== 1 || value.fingerprint !== fingerprint(versions)
      || !Number.isSafeInteger(value.offset) || value.offset! < 1 || value.offset! >= maximumPeopleTotal
      || !Number.isSafeInteger(value.limit) || value.limit! < 1 || value.limit! > maximumPageLimit
      || typeof value.parameters !== 'string' || value.parameters.length > 2048) throw cursorError()
    return value as Cursor
  } catch { throw cursorError() }
}

export function parsePeopleRequest(params: URLSearchParams, versions: DataVersions, now = new Date()): PeoplePageRequest {
  if (!params.has('cursor')) {
    const query = parsePeopleQuery(params, now)
    const cacheable = query.seed !== undefined && params.has('asOf')
    if (!query.pagination) return { query, cacheable }
    query.seed ??= randomBytes(16).toString('hex')
    return { query, cacheable, cursorParameters: parametersFor(query) }
  }
  if (params.toString().length > 8192 || [...params.keys()].some(key => !['cursor', 'limit'].includes(key))
    || params.getAll('cursor').length !== 1 || params.getAll('limit').length > 1) throw cursorError()
  const cursor = readCursor(params.get('cursor')!, versions)
  // Validate an explicit new limit independently so its error names the correct parameter.
  if (params.has('limit')) parsePeopleQuery(new URLSearchParams({ limit: params.get('limit')! }), now)
  const decoded = new URLSearchParams(cursor.parameters)
  if (!decoded.has('seed') || !decoded.has('asOf') || !decoded.has('count')
    || decoded.getAll('limit').length !== 1 || decoded.get('limit') !== String(maximumPageLimit)) throw cursorError()
  decoded.set('limit', params.get('limit') ?? String(cursor.limit))
  let query: PeopleQuery
  try { query = parsePeopleQuery(decoded, now) } catch { throw cursorError() }
  if (!query.pagination || cursor.offset >= query.pagination.total) throw cursorError()
  query.pagination.offset = cursor.offset
  query.count = Math.min(query.pagination.limit, query.pagination.total - cursor.offset)
  return { query, cacheable: true, cursorParameters: parametersFor(query) }
}

export function peoplePaginationMetadata(request: PeoplePageRequest, versions: DataVersions) {
  const page = request.query.pagination
  if (!page) return undefined
  const offset = page.offset + request.query.count
  const nextCursor = offset >= page.total ? null : Buffer.from(JSON.stringify({
    v: 1, offset, limit: page.limit, parameters: request.cursorParameters!, fingerprint: fingerprint(versions),
  } satisfies Cursor)).toString('base64url')
  if (nextCursor && nextCursor.length > maximumCursorLength) throw cursorError()
  return { total: page.total, limit: page.limit, offset: page.offset, nextCursor }
}
