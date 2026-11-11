import type { Command } from './arguments.js'

const defaultApiUrl = 'https://persona-dev.onrender.com'
const maximumResponseBytes = 256 * 1024

type PeopleEnvelope = { results: Record<string, unknown>[]; meta: Record<string, unknown> }

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

export async function fetchPeople(
  command: Extract<Command, { kind: 'people' }>, env: Record<string, string | undefined>, fetcher: typeof fetch,
): Promise<PeopleEnvelope> {
  const url = peopleUrl(command.apiUrl ?? env.PERSONA_API_URL ?? defaultApiUrl, command.query)
  let response: Response
  try {
    response = await fetcher(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000), redirect: 'error' })
  } catch {
    throw new Error('Could not connect to Persona (network failure, redirect or 30-second timeout). Check the API URL and try again.')
  }
  const body = await readJson(response)
  if (!response.ok) {
    const error = record(body) && record(body.error) ? body.error : undefined
    const code = typeof error?.code === 'string' ? error.code : 'HTTP_ERROR'
    const message = typeof error?.message === 'string' ? error.message : 'Request failed.'
    const parameter = typeof error?.parameter === 'string' ? ` (${error.parameter})` : ''
    const retry = response.status === 429 ? ` Retry after ${response.headers.get('retry-after') ?? 'the suggested delay'} seconds; no automatic retry was made.` : ''
    throw new Error(`Persona HTTP ${response.status} ${code}${parameter}: ${message}${retry}`)
  }
  if (!isEnvelope(body)) {
    throw new Error('Persona returned an invalid v2 response envelope.')
  }
  return body
}
