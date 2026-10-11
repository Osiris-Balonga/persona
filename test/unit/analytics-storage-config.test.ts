import { describe, expect, it } from 'vitest'
import { assertAnalyticsStorageConfig } from '../../scripts/check-analytics-storage-config.mjs'

const valid = { name: 'persona-analytics', triggers: { crons: ['17 2 * * *'] },
  r2_buckets: [{ binding: 'BACKUPS', bucket_name: 'persona-analytics-backups' }], durable_objects: {
  bindings: [{ name: 'USAGE', class_name: 'UsageStore' },
    { name: 'RECOVERY', class_name: 'RecoveryStore' }],
}, exports: {
  UsageStore: { type: 'durable-object', storage: 'sqlite' },
  RecoveryStore: { type: 'durable-object', storage: 'sqlite' },
} }

describe('analytics deployment storage guard', () => {
  it('accepts the durable identities used by the live Worker', () => {
    expect(() => assertAnalyticsStorageConfig(valid)).not.toThrow()
  })

  it('rejects a changed Worker, namespace, binding or destructive class declaration', () => {
    for (const changed of [
      { ...valid, name: 'persona-analytics-v2' },
      { ...valid, durable_objects: { bindings: [{ name: 'USAGE', class_name: 'UsageStoreV2' }] } },
      { ...valid, exports: { ...valid.exports, UsageStore: { type: 'durable-object', state: 'deleted' } } },
      { ...valid, exports: { ...valid.exports, UsageStore: { type: 'durable-object', storage: 'legacy-kv' } } },
      { ...valid, r2_buckets: [] },
      { ...valid, triggers: { crons: [] } },
    ]) expect(() => assertAnalyticsStorageConfig(changed)).toThrow()
  })
})
