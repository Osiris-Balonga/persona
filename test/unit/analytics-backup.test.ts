import { describe, expect, it, vi } from 'vitest'
import { createSnapshot, parseSnapshot, runBackup, verifyStoredBackup } from '../../worker/analytics-backup.js'

const row = { hour: '2026-09-28T09:00:00Z', total: 2, successes: 1, clientErrors: 1,
  rateLimited: 1, serverErrors: 0, profiles: 3, durationSumMs: 180,
  b0: 1, b1: 1, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 }

describe('analytics recovery snapshots', () => {
  it('rejects modified rows and malformed counters before restoring', async () => {
    const snapshot = await createSnapshot('staging', [row], new Date('2026-09-28T10:00:00Z'))
    expect(snapshot.rowCount).toBe(1)
    expect((await parseSnapshot(JSON.stringify(snapshot))).rows).toEqual([row])
    await expect(parseSnapshot(JSON.stringify({ ...snapshot, rows: [{ ...row, profiles: 99 }] })))
      .rejects.toThrow(/checksum/i)
    await expect(createSnapshot('staging', [{ ...row, total: -1 }], new Date()))
      .rejects.toThrow(/row/i)
  })

  it('writes a private export and restores it only into an isolated verification store', async () => {
    const files = new Map<string, string>()
    let recovered: unknown[] = []
    const source = vi.fn(async () => [row])
    const restore = vi.fn(async (rows: unknown[]) => { recovered = structuredClone(rows) })
    const result = await runBackup('production', {
      sourceRows: source,
      restoreVerification: restore,
      verificationRows: async () => recovered,
      put: async (key, value) => { files.set(key, value) },
      get: async (key) => files.get(key) ?? null,
    }, new Date('2026-09-28T10:00:00Z'))
    expect(result.key).toMatch(/^analytics\/v1\/production\/2026-09-28\//)
    expect(result.rows).toBe(1)
    expect(restore).toHaveBeenCalledOnce()
    expect(source).toHaveBeenCalledOnce()
    expect((await parseSnapshot(files.get(result.key)!)).rows).toEqual([row])
  })

  it('fails rather than reporting a successful backup when the stored copy is corrupted', async () => {
    const restore = vi.fn()
    await expect(runBackup('staging', {
      sourceRows: async () => [row],
      restoreVerification: restore,
      verificationRows: async () => [],
      put: async () => {},
      get: async () => '{"invalid":true}',
    }, new Date('2026-09-28T10:00:00Z'))).rejects.toThrow()
    expect(restore).not.toHaveBeenCalled()
  })

  it('can rehydrate an earlier backup in isolation when the active store is unavailable', async () => {
    const raw = JSON.stringify(await createSnapshot('production', [row], new Date('2026-09-28T10:00:00Z')))
    let recovered: unknown[] = []
    const sourceRows = vi.fn(async () => { throw new Error('active store unavailable') })
    const result = await verifyStoredBackup('production',
      'analytics/v1/production/2026-09-28/snapshot.json', {
        sourceRows,
        restoreVerification: async (rows) => { recovered = structuredClone(rows) },
        verificationRows: async () => recovered,
        put: async () => { throw new Error('should not overwrite') },
        get: async () => raw,
      }, new Date('2026-09-29T10:00:00Z'))
    expect(result.rows).toBe(1)
    expect(recovered).toEqual([row])
    expect(sourceRows).not.toHaveBeenCalled()
  })
})
