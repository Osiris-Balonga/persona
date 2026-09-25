import { buildApp } from './app.js'
import { readServerConfig } from './server-config.js'

const config = readServerConfig(process.env)
const app = buildApp({ logger: true, trustedProxies: config.trustedProxies, requireHttps: config.requireHttps })

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
