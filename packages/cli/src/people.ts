import type { Command } from './arguments.js'

const defaultApiUrl = 'https://persona-dev.onrender.com'
const maximumResponseBytes = 256 * 1024

export type PeopleEnvelope = { results: Record<string, unknown>[]; meta: Record<string, unknown> }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEnvelope(body: unknown): body is PeopleEnvelope {
  if (!record(body) || !record(body.meta) || !Array.isArray(body.results)) return false
  return body.results.length >= 1 && body.results.length <= 100 && body.results.every(record)
    && body.meta.schemaVersion === '2' && body.meta.count === body.results.length
    && typeof body.meta.asOf === 'string' && typeof body.meta.dataVersion === 'string'
    && typeof body.meta.catalogVersion === 'string'
    && (body.meta.seed === null || typeof body.meta.seed === 'string')
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error(`Persona returned HTTP ${response.status} with an empty response.`)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximumResponseBytes) throw new Error('Persona response exceeds the 256 KiB API limit.')
      chunks.push(value)
    }
  } finally {
    // Cancel on errors as well, so an oversized response cannot keep downloading.
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch {
    throw new Error(`Persona returned HTTP ${response.status} with a non-JSON response.`)
  }
}

function peopleUrl(base: string, query: Record<string, string>): URL {
  let url: URL
  try { url = new URL(base) } catch { throw new Error('Invalid API base URL.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API base URL must use HTTP(S) without credentials, query or fragment.')
  }
  url.pathname = `${url.pathname.replace(/\/$/, '')}/people`
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return url
}

async function requestPage(url: URL, fetcher: typeof fetch, retryRateLimits: boolean): Promise<PeopleEnvelope> {
  let response: Response
  for (let attempt = 0; ; attempt++) {
    try {
      response = await fetcher(new URL(url), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000), redirect: 'error' })
    } catch {
      throw new Error('Could not connect to Persona (network failure, redirect or 30-second timeout). Check the API URL and try again.')
    }
    const delay = response.headers.get('retry-after')
    if (response.status !== 429 || !retryRateLimits || attempt >= 3
      || delay === null || !/^\d+$/.test(delay) || Number(delay) > 120) break
    await response.body?.cancel()
    await new Promise(resolve => setTimeout(resolve, Number(delay) * 1000))
  }
  const body = await readJson(response)
  if (!response.ok) {
    const error = record(body) && record(body.error) ? body.error : undefined
    const code = typeof error?.code === 'string' ? error.code : 'HTTP_ERROR'
    const message = typeof error?.message === 'string' ? error.message : 'Request failed.'
    const parameter = typeof error?.parameter === 'string' ? ` (${error.parameter})` : ''
    const retry = response.status === 429 ? ` Retry after ${response.headers.get('retry-after') ?? 'the suggested delay'} seconds; ${retryRateLimits ? 'automatic retry budget exhausted or delay unsupported' : 'no automatic retry was made'}.` : ''
    throw new Error(`Persona HTTP ${response.status} ${code}${parameter}: ${message}${retry}`)
  }
  if (!isEnvelope(body)) {
    throw new Error('Persona returned an invalid v2 response envelope.')
  }
  return body
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function collectionMeta(meta: PeopleEnvelope['meta'], count: number) {
  const { pagination: _pagination, ...rest } = meta
  return { ...rest, count }
}

export async function* fetchPeoplePages(
  command: Extract<Command, { kind: 'people' }>, env: Record<string, string | undefined>, fetcher: typeof fetch,
): AsyncGenerator<PeopleEnvelope> {
  const total = Number(command.query.count ?? 1)
  const paginated = total > 100 || command.query.limit !== undefined
  const limit = Number(command.query.limit ?? 100)
  const url = peopleUrl(command.apiUrl ?? env.PERSONA_API_URL ?? defaultApiUrl, command.query)
  const seen = new Set<string>()
  let offset = 0
  let metadata: string | undefined
  do {
    const body = await requestPage(url, fetcher, paginated)
    if (!paginated) { yield body; return }
    const page = body.meta.pagination
    if (!record(page) || page.total !== total || page.limit !== limit || page.offset !== offset
      || body.results.length !== Math.min(limit, total - offset)
      || typeof body.meta.seed !== 'string' || !body.meta.seed
      || (command.query.seed !== undefined && body.meta.seed !== command.query.seed)
      || (command.query.asOf !== undefined && body.meta.asOf !== command.query.asOf)) {
      throw new Error('Persona returned inconsistent pagination metadata. Use an API with cursor pagination support.')
    }
    const currentMetadata = stable(collectionMeta(body.meta, total))
    metadata ??= currentMetadata
    if (metadata !== currentMetadata) throw new Error('Persona generation metadata changed during pagination; start a new export.')
    offset += body.results.length
    const cursor = page.nextCursor
    if ((offset === total && cursor !== null) || (offset < total && (typeof cursor !== 'string'
      || !/^[A-Za-z0-9_-]{1,4096}$/.test(cursor) || seen.has(cursor)))) {
      throw new Error('Persona returned an invalid or repeated pagination cursor.')
    }
    yield body
    if (cursor === null) return
    seen.add(cursor as string)
    url.search = ''
    url.searchParams.set('cursor', cursor as string)
  } while (offset < total)
}

export async function fetchPeople(
  command: Extract<Command, { kind: 'people' }>, env: Record<string, string | undefined>, fetcher: typeof fetch,
): Promise<PeopleEnvelope> {
  const results: PeopleEnvelope['results'] = []
  let meta: PeopleEnvelope['meta'] = {}
  for await (const page of fetchPeoplePages(command, env, fetcher)) {
    results.push(...page.results)
    meta = page.meta.pagination ? collectionMeta(page.meta, results.length) : page.meta
  }
  return { results, meta }
}

export async function* peopleJson(pages: AsyncIterable<PeopleEnvelope>, onComplete: (count: number) => void): AsyncGenerator<string> {
  let count = 0
  let meta: PeopleEnvelope['meta'] = {}
  yield '{\n  "results": ['
  for await (const page of pages) {
    for (const person of page.results) {
      yield `${count++ ? ',' : ''}\n${JSON.stringify(person, null, 2).split('\n').map(line => `    ${line}`).join('\n')}`
    }
    meta = page.meta.pagination ? collectionMeta(page.meta, count) : page.meta
  }
  yield `\n  ],\n  "meta": ${JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ')}\n}\n`
  onComplete(count)
}
