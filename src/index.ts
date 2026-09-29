import { buildApp } from './app.js'
import { readServerConfig } from './server-config.js'
import { createAnalyticsSink } from './analytics/client.js'

const config = readServerConfig(process.env)
const analyticsUrl = process.env.ANALYTICS_INGEST_URL
const analyticsToken = process.env.ANALYTICS_INGEST_TOKEN
if (Boolean(analyticsUrl) !== Boolean(analyticsToken) || (process.env.RENDER === 'true' && !analyticsUrl)) {
  throw new Error('ANALYTICS_INGEST_URL and ANALYTICS_INGEST_TOKEN are required together')
}
const app = buildApp({ logger: true, trustedProxies: config.trustedProxies, requireHttps: config.requireHttps,
  renderClientIp: config.renderClientIp,
  analytics: analyticsUrl && analyticsToken ? createAnalyticsSink(analyticsUrl, analyticsToken) : undefined })

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
