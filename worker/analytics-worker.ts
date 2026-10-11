import { DurableObject } from 'cloudflare:workers'
import { handleAnalyticsRequest, matchesToken, readLimitedBody, summarizeUsage, type StatsQuery, type UsageDispatch,
  type UsageEnvironment, type UsageEvent, type UsageRow } from './analytics-core.js'
import { parseSnapshot, runBackup, verifyStoredBackup, type BackupPorts } from './analytics-backup.js'

interface AnalyticsEnv {
  USAGE: DurableObjectNamespace<UsageStore>
  RECOVERY: DurableObjectNamespace<RecoveryStore>
  BACKUPS: R2Bucket
  ANALYTICS_STAGING_TOKEN: string
  ANALYTICS_PRODUCTION_TOKEN: string
  ANALYTICS_READ_TOKEN: string
  ANALYTICS_BACKUP_TOKEN: string
}

const columns = ['hour', 'total', 'successes', 'clientErrors', 'rateLimited', 'serverErrors',
  'profiles', 'durationSumMs', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const
const upsert = `INSERT INTO usage_hour (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
  ON CONFLICT(hour) DO UPDATE SET ${columns.slice(1).map((column) =>
    `${column} = usage_hour.${column} + excluded.${column}`).join(', ')}`

const createTable = `CREATE TABLE IF NOT EXISTS usage_hour (
  hour TEXT PRIMARY KEY, total INTEGER NOT NULL, successes INTEGER NOT NULL,
  clientErrors INTEGER NOT NULL, rateLimited INTEGER NOT NULL, serverErrors INTEGER NOT NULL,
  profiles INTEGER NOT NULL, durationSumMs INTEGER NOT NULL,
  b0 INTEGER NOT NULL, b1 INTEGER NOT NULL, b2 INTEGER NOT NULL, b3 INTEGER NOT NULL,
  b4 INTEGER NOT NULL, b5 INTEGER NOT NULL, b6 INTEGER NOT NULL)`
const selectRows = 'SELECT * FROM usage_hour ORDER BY hour'

// A recovery cutover requires a reviewed change to this constant. The original object stays intact.
const productionStore = 'primary' as 'primary' | 'recovered'

function activeStore(environment: UsageEnvironment, env: AnalyticsEnv): DurableObjectStub {
  if (environment === 'production' && productionStore === 'recovered') {
    return env.RECOVERY.get(env.RECOVERY.idFromName('recovered:production'))
  }
  return env.USAGE.get(env.USAGE.idFromName(environment))
}

export class UsageStore extends DurableObject<AnalyticsEnv> {
  constructor(ctx: DurableObjectState, env: AnalyticsEnv) {
    super(ctx, env)
    this.ctx.storage.sql.exec(createTable)
    this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS usage_history_import (
      id TEXT PRIMARY KEY, sourceKey TEXT NOT NULL, checksumSha256 TEXT NOT NULL,
      importedAt TEXT NOT NULL, rows INTEGER NOT NULL)`)
  }

  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname
    if (pathname === '/import-beta' && request.method === 'POST') {
      const input = await request.json() as { key: string; checksumSha256: string; rows: UsageRow[] }
      const result = this.ctx.storage.transactionSync(() => {
        const previous = this.ctx.storage.sql.exec(
          'SELECT * FROM usage_history_import WHERE id = ?', 'beta-history-v1').toArray()[0]
        if (previous) {
          if (previous.sourceKey !== input.key || previous.checksumSha256 !== input.checksumSha256) {
            return { conflict: true }
          }
          return { alreadyImported: true, ...previous }
        }
        const importedAt = new Date().toISOString()
        for (const row of input.rows) {
          const existing = this.ctx.storage.sql.exec('SELECT * FROM usage_hour WHERE hour = ?', row.hour).toArray()[0]
          if (columns.slice(1).some((column) => !Number.isSafeInteger(Number(existing?.[column] ?? 0) + Number(row[column])))) {
            return { conflict: true, error: 'History import would exceed safe counter limits' }
          }
        }
        for (const row of input.rows) this.ctx.storage.sql.exec(upsert, ...columns.map((column) => row[column]))
        this.ctx.storage.sql.exec('INSERT INTO usage_history_import VALUES (?, ?, ?, ?, ?)',
          'beta-history-v1', input.key, input.checksumSha256, importedAt, input.rows.length)
        return { alreadyImported: false, sourceKey: input.key, checksumSha256: input.checksumSha256,
          importedAt, rows: input.rows.length }
      })
      return Response.json(result, { status: 'conflict' in result ? 409 : 200,
        headers: { 'Cache-Control': 'no-store' } })
    }
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
    if (pathname === '/snapshot' && request.method === 'GET') {
      return Response.json({ rows: this.ctx.storage.sql.exec(selectRows).toArray() })
    }
    return new Response(null, { status: 404 })
  }
}

export class RecoveryStore extends UsageStore {
  async fetch(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname
    if (pathname === '/restore' && request.method === 'POST') {
      const { rows } = await request.json() as { rows: UsageRow[] }
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec('DELETE FROM usage_hour')
        const insert = `INSERT INTO usage_hour (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
        for (const row of rows) this.ctx.storage.sql.exec(insert, ...columns.map((column) => row[column]))
      })
      return new Response(null, { status: 204 })
    }
    return super.fetch(request)
  }
}

function backupPorts(environment: UsageEnvironment, env: AnalyticsEnv,
  target: 'verification' | 'recovered' = 'verification', historyChecksum?: string): BackupPorts {
  const source = activeStore(environment, env)
  const recoveryName = historyChecksum ? `history-verification:${historyChecksum}`
    : target === 'verification' ? `verification:${environment}` : `recovered:${environment}`
  const recovery = env.RECOVERY.get(env.RECOVERY.idFromName(recoveryName))
  const readRows = async (stub: DurableObjectStub, path: string) => {
    const response = await stub.fetch(`https://usage.internal/${path}`)
    if (!response.ok) throw new Error('Analytics snapshot read failed')
    return ((await response.json()) as { rows: UsageRow[] }).rows
  }
  return {
    sourceRows: () => readRows(source, 'snapshot'),
    restoreVerification: async (rows) => {
      const response = await recovery.fetch('https://usage.internal/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      if (!response.ok) throw new Error('Analytics verification restore failed')
    },
    verificationRows: () => readRows(recovery, 'snapshot'),
    put: async (key, value) => {
      const result = await env.BACKUPS.put(key, value, { httpMetadata: { contentType: 'application/json' } })
      if (!result) throw new Error('Analytics backup upload failed')
    },
    get: async (key) => (await env.BACKUPS.get(key))?.text() ?? null,
  }
}

function backupEnvironment(environment: UsageEnvironment, env: AnalyticsEnv) {
  return runBackup(environment, backupPorts(environment, env), new Date())
}

export default {
  async fetch(request: Request, env: AnalyticsEnv): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'POST' &&
      ['/v1/backups/run', '/v1/backups/verify', '/v1/history/import-beta'].includes(url.pathname) && !url.search) {
      if (!matchesToken(request.headers.get('authorization'), env.ANALYTICS_BACKUP_TOKEN)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      try {
        if (url.pathname === '/v1/backups/run') {
          if ((await request.text()).length) return Response.json({ error: 'Unexpected body' }, { status: 400 })
          const backups = await Promise.all([
            backupEnvironment('staging', env), backupEnvironment('production', env),
          ])
          return Response.json({ backups }, { headers: { 'Cache-Control': 'no-store' } })
        }
        if (request.headers.get('content-type') !== 'application/json' ||
          Number(request.headers.get('content-length') ?? 0) > 512) {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }
        const body = await readLimitedBody(request, 512)
        if (body === null) return Response.json({ error: 'Invalid request' }, { status: 400 })
        let input: Record<string, unknown>
        try { input = JSON.parse(body) as Record<string, unknown> }
        catch { return Response.json({ error: 'Invalid request' }, { status: 400 }) }
        if (url.pathname === '/v1/history/import-beta') {
          if (!input || Object.keys(input).join(',') !== 'key' || typeof input.key !== 'string') {
            return Response.json({ error: 'Invalid request' }, { status: 400 })
          }
          if (productionStore !== 'primary') {
            return Response.json({ error: 'History import is disabled on recovered storage' }, { status: 409 })
          }
          const raw = await (await env.BACKUPS.get(input.key))?.text()
          if (raw === undefined) throw new Error('Analytics backup was not readable from R2')
          const snapshot = await parseSnapshot(raw)
          const ports = backupPorts('staging', env, 'verification', snapshot.checksumSha256)
          // Verify exactly the bytes imported, even if the R2 key changes during this request.
          const verified = await verifyStoredBackup('staging', input.key, { ...ports, get: async () => raw }, new Date())
          if (snapshot.rows.length === 0) return Response.json({ error: 'Beta history is empty' }, { status: 400 })
          return await activeStore('production', env).fetch('https://usage.internal/import-beta', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: verified.key, checksumSha256: verified.checksumSha256, rows: snapshot.rows }),
          })
        }
        if (!input || Object.keys(input).sort().join(',') !== 'environment,key' ||
          (input.environment !== 'staging' && input.environment !== 'production') ||
          typeof input.key !== 'string') {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }
        if (input.environment === 'production' && productionStore === 'recovered') {
          return Response.json({ error: 'Recovery target is active' }, { status: 409 })
        }
        const result = await verifyStoredBackup(input.environment, input.key,
          backupPorts(input.environment, env, 'recovered'), new Date())
        return Response.json({ ...result, recoveryObject: `recovered:${input.environment}` },
          { headers: { 'Cache-Control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: 'Backup operation failed',
          detail: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 })
      }
    }
    const dispatch: UsageDispatch = (environment: UsageEnvironment, operation, payload) => {
      const stub = activeStore(environment, env)
      return stub.fetch(`https://usage.internal/${operation}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    return handleAnalyticsRequest(request, {
      stagingToken: env.ANALYTICS_STAGING_TOKEN,
      productionToken: env.ANALYTICS_PRODUCTION_TOKEN,
      readToken: env.ANALYTICS_READ_TOKEN,
    }, dispatch)
  },
  async scheduled(_controller: ScheduledController, env: AnalyticsEnv): Promise<void> {
    await backupEnvironment('staging', env)
    await backupEnvironment('production', env)
  },
}
