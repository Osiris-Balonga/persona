import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createSnapshot } from '../../worker/analytics-backup.js'

const tokens = {
  ANALYTICS_STAGING_TOKEN: 'local-staging-test-token',
  ANALYTICS_PRODUCTION_TOKEN: 'local-production-test-token',
  ANALYTICS_READ_TOKEN: 'local-read-test-token',
  ANALYTICS_BACKUP_TOKEN: 'local-backup-test-token',
}
let script: string
let directory: string
let runtime: Miniflare

function createRuntime() {
  return new Miniflare(convertV4MiniflareOptions({
    name: 'persona-analytics-test', modules: true, script, compatibilityDate: '2026-09-28',
    resourcePersistencePath: directory, cf: false, telemetry: { enabled: false },
    durableObjects: {
      USAGE: { className: 'UsageStore', useSQLite: true },
      RECOVERY: { className: 'RecoveryStore', useSQLite: true },
    },
    r2Buckets: ['BACKUPS'], bindings: tokens,
    outboundService: () => new Response('External network disabled in tests', { status: 502 }),
  }))
}

beforeAll(async () => {
  const bundle = await build({ entryPoints: ['worker/analytics-worker.ts'], bundle: true,
    write: false, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'] })
  script = bundle.outputFiles[0].text
})
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'persona-analytics-test-'))
  runtime = createRuntime()
})
afterEach(async () => {
  await runtime?.dispose()
  // Only remove the private temporary directory created for this test.
  if (resolve(directory).startsWith(resolve(tmpdir()) + '\\') ||
    resolve(directory).startsWith(resolve(tmpdir()) + '/')) {
    await rm(directory, { recursive: true, force: true })
  } else throw new Error('Test storage is outside the temporary root')
})

const request = (path: string, token: string, body?: unknown) => runtime.dispatchFetch(`https://analytics.test${path}`, {
  method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`,
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
  body: body === undefined ? undefined : JSON.stringify(body),
})
const ingest = (statusCode: number, profileCount: number, durationMs: number, production = false) =>
  request('/v1/events', production ? tokens.ANALYTICS_PRODUCTION_TOKEN : tokens.ANALYTICS_STAGING_TOKEN,
    { statusCode, profileCount, durationMs })
function statsPath(environment: string) {
  const today = new Date()
  const from = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10)
  const to = new Date(today.getTime() + 2 * 86_400_000).toISOString().slice(0, 10)
  return `/v1/stats?environment=${environment}&from=${from}&to=${to}&granularity=hour`
}
const stats = async (environment = 'staging') => {
  const response = await request(statsPath(environment), tokens.ANALYTICS_READ_TOKEN)
  expect(response.status).toBe(200)
  return await response.json() as { points: Array<Record<string, number | string | null>> }
}
const rows = async (binding: string, name: string) => {
  const namespace = await runtime.getDurableObjectNamespace(binding)
  const response = await namespace.get(namespace.idFromName(name)).fetch('https://usage.internal/snapshot')
  return await response.json() as { rows: Array<Record<string, number | string>> }
}

describe('analytics Worker with local SQLite and R2', () => {
  it('imports a verified beta snapshot once without losing production data or copying later staging usage', async () => {
    await ingest(200, 9, 60)
    await ingest(429, 0, 500)
    await ingest(200, 4, 80, true)
    const run = await runtime.dispatchFetch('https://analytics.test/v1/backups/run', {
      method: 'POST', headers: { Authorization: `Bearer ${tokens.ANALYTICS_BACKUP_TOKEN}` } })
    const { backups } = await run.json() as { backups: Array<{ key: string }> }
    const key = backups.find((backup) => backup.key.startsWith('analytics/v1/staging/'))!.key
    const betaBefore = await rows('USAGE', 'staging')
    expect((await request('/v1/history/import-beta', tokens.ANALYTICS_READ_TOKEN, { key })).status).toBe(401)
    const attempts = await Promise.all(Array.from({ length: 2 }, () =>
      request('/v1/history/import-beta', tokens.ANALYTICS_BACKUP_TOKEN, { key })))
    expect(attempts.map((response) => response.status)).toEqual([200, 200])
    const receipts = await Promise.all(attempts.map((response) => response.json()))
    expect(receipts.filter((receipt) => !receipt.alreadyImported)).toHaveLength(1)
    expect((await stats('production')).points[0]).toMatchObject({ requests: 3, profiles: 13,
      clientErrors: 1, rateLimited: 1, averageLatencyMs: 213 })
    expect(await rows('USAGE', 'staging')).toEqual(betaBefore)
    await runtime.dispose()
    runtime = createRuntime()
    expect((await request('/v1/history/import-beta', tokens.ANALYTICS_BACKUP_TOKEN, { key })).status).toBe(200)
    await ingest(200, 100, 10)
    await ingest(200, 2, 30, true)
    expect((await stats('production')).points[0]).toMatchObject({ requests: 4, profiles: 15 })
    const bucket = await runtime.getR2Bucket('BACKUPS')
    const original = await bucket.get(key)
    const replaced = JSON.parse(await original!.text())
    replaced.rows[0].profiles += 1
    const validReplacement = await createSnapshot('staging', replaced.rows, new Date(replaced.createdAt))
    await bucket.put(key, JSON.stringify(validReplacement))
    expect((await request('/v1/history/import-beta', tokens.ANALYTICS_BACKUP_TOKEN, { key })).status).toBe(409)
    expect((await stats('production')).points[0]).toMatchObject({ requests: 4, profiles: 15 })
    const laterRun = await runtime.dispatchFetch('https://analytics.test/v1/backups/run', {
      method: 'POST', headers: { Authorization: `Bearer ${tokens.ANALYTICS_BACKUP_TOKEN}` } })
    const later = await laterRun.json() as { backups: Array<{ key: string }> }
    const laterKey = later.backups.find((backup) => backup.key.startsWith('analytics/v1/staging/'))!.key
    expect((await request('/v1/history/import-beta', tokens.ANALYTICS_BACKUP_TOKEN, { key: laterKey })).status).toBe(409)
    expect((await stats('production')).points[0]).toMatchObject({ requests: 4, profiles: 15 })
    const productionKey = later.backups.find((backup) => backup.key.startsWith('analytics/v1/production/'))!.key
    const productionBackup = await bucket.get(productionKey)
    const saved = JSON.parse(await productionBackup!.text())
    expect(saved.rows[0]).toMatchObject({ total: 4, profiles: 15 })
  })

  it('rejects corrupted beta history before writing production counters', async () => {
    await ingest(200, 7, 45)
    await ingest(200, 3, 70, true)
    const run = await runtime.dispatchFetch('https://analytics.test/v1/backups/run', {
      method: 'POST', headers: { Authorization: `Bearer ${tokens.ANALYTICS_BACKUP_TOKEN}` } })
    const { backups } = await run.json() as { backups: Array<{ key: string }> }
    const key = backups.find((backup) => backup.key.startsWith('analytics/v1/staging/'))!.key
    const bucket = await runtime.getR2Bucket('BACKUPS')
    const source = await bucket.get(key)
    const corrupt = JSON.parse(await source!.text())
    corrupt.rows[0].profiles += 1
    await bucket.put(key, JSON.stringify(corrupt))
    const before = await rows('USAGE', 'production')
    expect((await request('/v1/history/import-beta', tokens.ANALYTICS_BACKUP_TOKEN, { key })).status).toBe(503)
    expect(await rows('USAGE', 'production')).toEqual(before)
  })

  it('rejects malformed and streamed oversized history requests as client errors', async () => {
    const headers = { Authorization: `Bearer ${tokens.ANALYTICS_BACKUP_TOKEN}`, 'Content-Type': 'application/json' }
    for (const path of ['/v1/history/import-beta', '/v1/backups/verify']) {
      const malformed = await runtime.dispatchFetch(`https://analytics.test${path}`, {
        method: 'POST', headers, body: '{' })
      expect(malformed.status).toBe(400)
      const oversized = new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ key: 'é'.repeat(300) })))
        controller.close()
      } })
      const response = await runtime.dispatchFetch(`https://analytics.test${path}`, {
        method: 'POST', headers, body: oversized, duplex: 'half' })
      expect(response.status).toBe(400)
    }
    expect((await rows('USAGE', 'production')).rows).toEqual([])
  })

  it('rejects an overflowing history sum atomically before importing any hourly row', async () => {
    await ingest(200, 3, 20, true)
    await ingest(200, 5, 30)
    const staging = (await rows('USAGE', 'staging')).rows[0]
    const hourBefore = new Date(Date.parse(String(staging.hour)) - 3_600_000).toISOString().replace('.000Z', 'Z')
    const snapshot = await createSnapshot('staging', [
      { ...staging, hour: hourBefore }, { ...staging, profiles: Number.MAX_SAFE_INTEGER },
    ], new Date())
    const key = `analytics/v1/staging/${snapshot.createdAt.slice(0, 10)}/overflow.json`
    const bucket = await runtime.getR2Bucket('BACKUPS')
    await bucket.put(key, JSON.stringify(snapshot))
    const before = await rows('USAGE', 'production')
    expect((await request('/v1/history/import-beta', tokens.ANALYTICS_BACKUP_TOKEN, { key })).status).toBe(409)
    expect(await rows('USAGE', 'production')).toEqual(before)
  })

  it('aggregates real SQL writes, separates environments, and authenticates reads', async () => {
    for (const event of [[200, 3, 40], [304, 0, 120], [400, 0, 300], [429, 0, 600], [500, 0, 1_100]]) {
      expect((await ingest(...event as [number, number, number])).status).toBe(202)
    }
    expect((await ingest(200, 2, 80, true)).status).toBe(202)
    const staging = await stats()
    expect(staging.points.reduce((sum, point) => sum + Number(point.requests), 0)).toBe(5)
    const stored = (await rows('USAGE', 'staging')).rows
    expect(stored.map((row) => row.hour)).toEqual(expect.arrayContaining([expect.stringMatching(/T\d{2}:00:00Z$/)]))
    for (const [column, value] of Object.entries({ total: 5, successes: 2, clientErrors: 2,
      rateLimited: 1, serverErrors: 1, profiles: 3, durationSumMs: 2_160 })) {
      expect(stored.reduce((sum, row) => sum + Number(row[column]), 0)).toBe(value)
    }
    expect((await stats('production')).points.reduce((sum, point) => sum + Number(point.profiles), 0)).toBe(2)
    expect((await request(statsPath('staging'), tokens.ANALYTICS_STAGING_TOKEN)).status).toBe(401)
    expect((await request('/v1/events', 'wrong-token', { statusCode: 200, profileCount: 100, durationMs: 0 })).status).toBe(401)
    expect((await stats()).points.reduce((sum, point) => sum + Number(point.requests), 0)).toBe(5)
  })

  it('retains SQLite aggregates across complete runtime reinitialization', async () => {
    expect((await ingest(200, 7, 42)).status).toBe(202)
    const before = await rows('USAGE', 'staging')
    await runtime.dispose()
    runtime = createRuntime()
    expect(await rows('USAGE', 'staging')).toEqual(before)
    expect((await stats()).points[0]).toMatchObject({ requests: 1, profiles: 7, averageLatencyMs: 42 })
  })

  it('backs up to local R2, restores an isolated object, and rejects corruption without changing active SQL', async () => {
    await ingest(200, 4, 60)
    await ingest(429, 0, 500)
    const active = await rows('USAGE', 'staging')
    const run = await runtime.dispatchFetch('https://analytics.test/v1/backups/run', {
      method: 'POST', headers: { Authorization: `Bearer ${tokens.ANALYTICS_BACKUP_TOKEN}` } })
    expect(run.status).toBe(200)
    const { backups } = await run.json() as { backups: Array<{ key: string; checksumSha256: string }> }
    const saved = backups.find((item) => item.key.startsWith('analytics/v1/staging/'))!
    const bucket = await runtime.getR2Bucket('BACKUPS')
    const object = await bucket.get(saved.key)
    expect(object).not.toBeNull()
    const snapshot = JSON.parse(await object!.text())
    expect(snapshot.checksumSha256).toBe(saved.checksumSha256)
    expect(snapshot.rows).toEqual(active.rows)
    const restored = await request('/v1/backups/verify', tokens.ANALYTICS_BACKUP_TOKEN,
      { environment: 'staging', key: saved.key })
    expect(restored.status).toBe(200)
    expect(await rows('RECOVERY', 'recovered:staging')).toEqual(active)
    expect(await rows('USAGE', 'staging')).toEqual(active)
    snapshot.rows[0].profiles += 1
    await bucket.put(saved.key, JSON.stringify(snapshot))
    const failed = await request('/v1/backups/verify', tokens.ANALYTICS_BACKUP_TOKEN,
      { environment: 'staging', key: saved.key })
    expect(failed.status).toBe(503)
    expect((await failed.json() as { detail: string }).detail).toContain('checksum mismatch')
    expect(await rows('RECOVERY', 'recovered:staging')).toEqual(active)
    expect(await rows('USAGE', 'staging')).toEqual(active)
  })
})
