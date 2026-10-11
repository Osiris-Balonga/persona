import type { UsageEnvironment, UsageRow } from './analytics-core.js'

const rowFields = ['hour', 'total', 'successes', 'clientErrors', 'rateLimited', 'serverErrors',
  'profiles', 'durationSumMs', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const

type SnapshotBody = { schemaVersion: 1; environment: UsageEnvironment; createdAt: string;
  rowCount: number;
  rows: UsageRow[] }
export type BackupSnapshot = SnapshotBody & { checksumSha256: string }

function validRow(value: unknown): value is UsageRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  if (Object.keys(row).sort().join(',') !== [...rowFields].sort().join(',')) return false
  if (typeof row.hour !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00:00Z$/.test(row.hour) ||
    Number.isNaN(Date.parse(row.hour))) return false
  if (rowFields.slice(1).some((field) => !Number.isSafeInteger(row[field]) || Number(row[field]) < 0)) return false
  return Number(row.successes) + Number(row.clientErrors) + Number(row.serverErrors) === row.total &&
    Number(row.rateLimited) <= Number(row.clientErrors) &&
    rowFields.slice(8).reduce((sum, field) => sum + Number(row[field]), 0) === row.total
}

function assertRows(rows: unknown): asserts rows is UsageRow[] {
  if (!Array.isArray(rows) || rows.length > 100_000 || !rows.every(validRow) ||
    new Set(rows.map((row) => row.hour)).size !== rows.length ||
    rows.some((row, index) => index > 0 && row.hour <= rows[index - 1].hour)) {
    throw new Error('Invalid analytics backup rows')
  }
}

async function checksum(value: SnapshotBody): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createSnapshot(environment: UsageEnvironment, rows: unknown,
  now: Date): Promise<BackupSnapshot> {
  assertRows(rows)
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid backup time')
  const body: SnapshotBody = { schemaVersion: 1, environment, createdAt: now.toISOString(),
    rowCount: rows.length, rows }
  return { ...body, checksumSha256: await checksum(body) }
}

export async function parseSnapshot(raw: string): Promise<BackupSnapshot> {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid backup')
  const item = parsed as Record<string, unknown>
  if (Object.keys(item).sort().join(',') !==
    'checksumSha256,createdAt,environment,rowCount,rows,schemaVersion') throw new Error('Invalid backup schema')
  if (item.schemaVersion !== 1 || (item.environment !== 'staging' && item.environment !== 'production') ||
    typeof item.createdAt !== 'string' || new Date(item.createdAt).toISOString() !== item.createdAt ||
    typeof item.checksumSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.checksumSha256)) {
    throw new Error('Invalid backup schema')
  }
  assertRows(item.rows)
  if (item.rowCount !== item.rows.length) throw new Error('Invalid backup row count')
  const body: SnapshotBody = { schemaVersion: 1, environment: item.environment,
    createdAt: item.createdAt, rowCount: item.rowCount, rows: item.rows }
  if (await checksum(body) !== item.checksumSha256) throw new Error('Analytics backup checksum mismatch')
  return { ...body, checksumSha256: item.checksumSha256 }
}

export interface BackupPorts {
  sourceRows(): Promise<unknown>
  restoreVerification(rows: UsageRow[]): Promise<void>
  verificationRows(): Promise<unknown>
  put(key: string, value: string): Promise<void>
  get(key: string): Promise<string | null>
}

export async function verifyStoredBackup(environment: UsageEnvironment, key: string,
  ports: BackupPorts, now: Date) {
  if (!key.startsWith(`analytics/v1/${environment}/`) || !/^analytics\/v1\/(staging|production)\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9:._-]+\.json$/.test(key)) {
    throw new Error('Invalid analytics backup key')
  }
  const stored = await ports.get(key)
  if (stored === null) throw new Error('Analytics backup was not readable from R2')
  const verified = await parseSnapshot(stored)
  if (verified.environment !== environment) throw new Error('Analytics backup environment mismatch')
  await ports.restoreVerification(verified.rows)
  const restored = await createSnapshot(environment, await ports.verificationRows(),
    new Date(verified.createdAt))
  if (restored.checksumSha256 !== verified.checksumSha256) {
    throw new Error('Analytics backup restore verification failed')
  }
  return { key, rows: verified.rowCount, checksumSha256: verified.checksumSha256,
    verifiedAt: now.toISOString() }
}

export async function runBackup(environment: UsageEnvironment, ports: BackupPorts, now: Date) {
  const snapshot = await createSnapshot(environment, await ports.sourceRows(), now)
  const key = `analytics/v1/${environment}/${snapshot.createdAt.slice(0, 10)}/${snapshot.createdAt}-${crypto.randomUUID()}.json`
  await ports.put(key, JSON.stringify(snapshot))
  const verified = await verifyStoredBackup(environment, key, ports, now)
  if (verified.checksumSha256 !== snapshot.checksumSha256) {
    throw new Error('Analytics backup differs from source')
  }
  return verified
}
