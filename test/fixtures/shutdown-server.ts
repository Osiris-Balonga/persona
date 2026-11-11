import { buildApp } from '../../src/app.js'
import { installShutdown } from '../../src/shutdown.js'

const app = buildApp()
app.get('/slow', async () => {
  process.send?.({ type: 'started' })
  await new Promise<void>((resolve) => {
    process.once('message', () => resolve())
  })
  return { complete: true }
})
app.addHook('onClose', async () => { process.disconnect?.() })
app.addHook('preClose', async () => { process.send?.({ type: 'closing' }) })
const address = await app.listen({ host: '127.0.0.1', port: 0 })
installShutdown(app)
process.send?.({ type: 'ready', address })
