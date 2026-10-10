export type UsageEnvironment = 'staging' | 'production'
export type UsageEvent = { statusCode: number; profileCount: number; durationMs: number }
export type StatsQuery = { from: string; to: string; granularity: 'hour' | 'day' }
export type UsageDispatch = (environment: UsageEnvironment, operation: 'record' | 'query',
  payload: UsageEvent | StatsQuery) => Promise<Response>

export interface AnalyticsSecrets {
  stagingToken: string
  productionToken: string
  readToken: string
}

export interface UsageRow {
  hour: string
  total: number
  successes: number
  clientErrors: number
  rateLimited: number
  serverErrors: number
  profiles: number
  durationSumMs: number
  b0: number; b1: number; b2: number; b3: number; b4: number; b5: number; b6: number
}

const json = (value: unknown, status: number) => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
})

export function matchesToken(provided: string | null, expected: string): boolean {
  const actual = provided?.startsWith('Bearer ') ? provided.slice(7) : ''
  if (!expected || !actual) return false
  let difference = actual.length ^ expected.length
  for (let index = 0; index < Math.max(actual.length, expected.length); index++) {
    difference |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0)
  }
  return difference === 0
}

function parseEvent(value: unknown): UsageEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  if (Object.keys(item).sort().join(',') !== 'durationMs,profileCount,statusCode') return null
  const { statusCode, profileCount, durationMs } = item
  if (!Number.isInteger(statusCode) || Number(statusCode) < 200 || Number(statusCode) > 599 ||
    !Number.isInteger(profileCount) || Number(profileCount) < 0 || Number(profileCount) > 100 ||
    typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0 || durationMs > 600_000 ||
    (statusCode !== 200 && profileCount !== 0)) return null
  return { statusCode: statusCode as number, profileCount: profileCount as number, durationMs }
}

function parseDay(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null
}

function parseStatsQuery(params: URLSearchParams): { environment: UsageEnvironment; query: StatsQuery } | null {
  if ([...params.keys()].sort().join(',') !== 'environment,from,granularity,to') return null
  const environment = params.get('environment')
  const granularity = params.get('granularity')
  const from = params.get('from')
  const to = params.get('to')
  const start = parseDay(from)
  const end = parseDay(to)
  if ((environment !== 'staging' && environment !== 'production') ||
    (granularity !== 'hour' && granularity !== 'day') || start === null || end === null ||
    end <= start || end - start > 366 * 86_400_000) return null
  return { environment, query: { from: from!, to: to!, granularity } }
}

async function readLimitedBody(request: Request, limit: number): Promise<string | null> {
  const reader = request.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > limit) { await reader.cancel(); return null }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

export async function handleAnalyticsRequest(request: Request, secrets: AnalyticsSecrets,
  dispatch: UsageDispatch): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/v1/events' && !url.search) {
    const authorization = request.headers.get('authorization')
    const environment = matchesToken(authorization, secrets.stagingToken) ? 'staging'
      : matchesToken(authorization, secrets.productionToken) ? 'production' : null
    if (!environment) return json({ error: 'Unauthorized' }, 401)
    if (request.headers.get('content-type') !== 'application/json' ||
      Number(request.headers.get('content-length') ?? 0) > 512) return json({ error: 'Invalid event' }, 400)
    const raw = await readLimitedBody(request, 512)
    if (raw === null) return json({ error: 'Invalid event' }, 400)
    let event: UsageEvent | null
    try { event = parseEvent(JSON.parse(raw)) } catch { event = null }
    if (!event) return json({ error: 'Invalid event' }, 400)
    try {
      const stored = await dispatch(environment, 'record', event)
      return stored.ok ? new Response(null, { status: 202,
        headers: { 'Cache-Control': 'no-store' } }) : json({ error: 'Analytics unavailable' }, 503)
    } catch { return json({ error: 'Analytics unavailable' }, 503) }
  }
  if (request.method === 'GET' && url.pathname === '/v1/stats') {
    if (!matchesToken(request.headers.get('authorization'), secrets.readToken)) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const parsed = parseStatsQuery(url.searchParams)
    if (!parsed) return json({ error: 'Invalid period' }, 400)
    try {
      const result = await dispatch(parsed.environment, 'query', parsed.query)
      return result.ok ? new Response(result.body, { status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
        : json({ error: 'Analytics unavailable' }, 503)
    } catch { return json({ error: 'Analytics unavailable' }, 503) }
  }
  return json({ error: 'Not found' }, 404)
}

export function summarizeUsage(rows: readonly UsageRow[], granularity: 'hour' | 'day') {
  const groups = new Map<string, Omit<UsageRow, 'hour'>>()
  const columns = ['total', 'successes', 'clientErrors', 'rateLimited', 'serverErrors', 'profiles',
    'durationSumMs', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const
  for (const row of rows) {
    const period = granularity === 'day' ? row.hour.slice(0, 10) : row.hour.slice(0, 13) + ':00Z'
    const existing = groups.get(period) ?? Object.fromEntries(columns.map((key) => [key, 0])) as Omit<UsageRow, 'hour'>
    for (const key of columns) existing[key] += row[key]
    groups.set(period, existing)
  }
  return [...groups].map(([period, totals]) => {
    const threshold = Math.ceil(totals.total * 0.95)
    let cumulative = 0
    let latencyP95UpperBoundMs: number | null = null
    const upperBounds = [100, 250, 500, 1_000, 2_500, 5_000, null]
    for (let index = 0; index < upperBounds.length; index++) {
      cumulative += totals[`b${index}` as keyof typeof totals]
      if (cumulative >= threshold) { latencyP95UpperBoundMs = upperBounds[index]; break }
    }
    return { period, requests: totals.total, successes: totals.successes,
      clientErrors: totals.clientErrors, rateLimited: totals.rateLimited,
      serverErrors: totals.serverErrors, profiles: totals.profiles,
      averageLatencyMs: totals.total ? Math.round(totals.durationSumMs / totals.total) : 0,
      latencyP95UpperBoundMs }
  })
}
