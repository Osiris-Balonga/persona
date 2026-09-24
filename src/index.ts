import { buildApp } from './app.js'
import { readServerConfig } from './server-config.js'

const app = buildApp({ logger: true })

try {
  await app.listen(readServerConfig(process.env))
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
