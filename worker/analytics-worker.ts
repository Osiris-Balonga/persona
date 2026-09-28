import { DurableObject } from 'cloudflare:workers'
import { handleAnalyticsRequest, summarizeUsage, type StatsQuery, type UsageDispatch,
  type UsageEnvironment, type UsageEvent, type UsageRow } from './analytics-core.js'

interface AnalyticsEnv {
  USAGE: DurableObjectNamespace<UsageStore>
  ANALYTICS_STAGING_TOKEN: string
  ANALYTICS_PRODUCTION_TOKEN: string
  ANALYTICS_READ_TOKEN: string
}

const columns = ['hour', 'total', 'successes', 'clientErrors', 'rateLimited', 'serverErrors',
  'profiles', 'durationSumMs', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const
const upsert = `INSERT INTO usage_hour (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
  ON CONFLICT(hour) DO UPDATE SET ${columns.slice(1).map((column) =>
    `${column} = usage_hour.${column} + excluded.${column}`).join(', ')}`

export class UsageStore extends DurableObject<AnalyticsEnv> {
  constructor(ctx: DurableObjectState, env: AnalyticsEnv) {
    super(ctx, env)
    this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS usage_hour (
      hour TEXT PRIMARY KEY, total INTEGER NOT NULL, successes INTEGER NOT NULL,
      clientErrors INTEGER NOT NULL, rateLimited INTEGER NOT NULL, serverErrors INTEGER NOT NULL,
      profiles INTEGER NOT NULL, durationSumMs INTEGER NOT NULL,
      b0 INTEGER NOT NULL, b1 INTEGER NOT NULL, b2 INTEGER NOT NULL, b3 INTEGER NOT NULL,
      b4 INTEGER NOT NULL, b5 INTEGER NOT NULL, b6 INTEGER NOT NULL)`)
  }

  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname
    if (pathname === '/record' && request.method === 'POST') {
      const event = await request.json() as UsageEvent
      const hour = new Date().toISOString().slice(0, 13) + ':00:00Z'
      const bucket = [100, 250, 500, 1_000, 2_500, 5_000].findIndex((bound) => event.durationMs <= bound)
      const values = [hour, 1, Number(event.statusCode < 400),
        Number(event.statusCode >= 400 && event.statusCode < 500), Number(event.statusCode === 429),
        Number(event.statusCode >= 500), event.profileCount, Math.round(event.durationMs),
        ...Array.from({ length: 7 }, (_, index) => Number(index === (bucket < 0 ? 6 : bucket)))]
      this.ctx.storage.sql.exec(upsert, ...values)
      return new Response(null, { status: 204 })
    }
    if (pathname === '/query' && request.method === 'POST') {
      const query = await request.json() as StatsQuery
      const rows = this.ctx.storage.sql.exec('SELECT * FROM usage_hour WHERE hour >= ? AND hour < ? ORDER BY hour',
        `${query.from}T00:00:00Z`, `${query.to}T00:00:00Z`).toArray() as unknown as UsageRow[]
      return Response.json({ from: query.from, to: query.to, granularity: query.granularity,
        points: summarizeUsage(rows, query.granularity) })
    }
    return new Response(null, { status: 404 })
  }
}

export default {
  fetch(request: Request, env: AnalyticsEnv): Promise<Response> {
    const dispatch: UsageDispatch = (environment: UsageEnvironment, operation, payload) => {
      const stub = env.USAGE.get(env.USAGE.idFromName(environment))
      return stub.fetch(`https://usage.internal/${operation}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    return handleAnalyticsRequest(request, {
      stagingToken: env.ANALYTICS_STAGING_TOKEN,
      productionToken: env.ANALYTICS_PRODUCTION_TOKEN,
      readToken: env.ANALYTICS_READ_TOKEN,
    }, dispatch)
  },
}
