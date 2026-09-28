import { readFileSync } from 'node:fs'

export function assertAnalyticsStorageConfig(config) {
  const bindings = config?.durable_objects?.bindings
  const usage = config?.exports?.UsageStore
  const recovery = config?.exports?.RecoveryStore
  if (config?.name !== 'persona-analytics' ||
    !config?.r2_buckets?.some((bucket) => bucket.binding === 'BACKUPS' &&
      bucket.bucket_name === 'persona-analytics-backups') ||
    !config?.triggers?.crons?.includes('17 2 * * *') || !Array.isArray(bindings) ||
    bindings.length !== 2 ||
    !bindings.some((binding) => binding.name === 'USAGE' && binding.class_name === 'UsageStore' && !binding.script_name) ||
    !bindings.some((binding) => binding.name === 'RECOVERY' && binding.class_name === 'RecoveryStore' && !binding.script_name) ||
    Object.keys(config.exports ?? {}).sort().join(',') !== 'RecoveryStore,UsageStore' ||
    [usage, recovery].some((entry) => entry?.type !== 'durable-object' ||
      entry.storage !== 'sqlite' || (entry.state && entry.state !== 'created'))) {
    throw new Error('Analytics Durable Object identity changed: review and migrate storage explicitly')
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/check-analytics-storage-config.mjs')) {
  const config = JSON.parse(readFileSync('wrangler.analytics.jsonc', 'utf8'))
  assertAnalyticsStorageConfig(config)
}
