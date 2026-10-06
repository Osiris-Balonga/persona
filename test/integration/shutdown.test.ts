import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app.js'
import { installShutdown } from '../../src/shutdown.js'

describe('API shutdown over HTTP', () => {
  it('rejects new requests while finishing an active request', async () => {
    const app = buildApp()
    let release!: () => void
    let started!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const ready = new Promise<void>((resolve) => { started = resolve })
    app.get('/slow', async () => { started(); await pending; return { complete: true } })
    const runtime = Object.assign(new EventEmitter(), { exit: vi.fn(), exitCode: undefined as number | string | undefined })
    const dispose = installShutdown(app, runtime)
    try {
      const address = await app.listen({ host: '127.0.0.1', port: 0 })
      const response = fetch(`${address}/slow`)
      await ready
      runtime.emit('SIGTERM')
      await vi.waitFor(() => expect(app.server.listening).toBe(false))
      expect(runtime.exitCode).toBeUndefined()
      const nextStatus = await fetch(`${address}/health`, { signal: AbortSignal.timeout(1_000) })
        .then((result) => result.status, () => 503)
      expect(nextStatus).toBe(503)
      release()
      expect(await (await response).json()).toEqual({ complete: true })
      await vi.waitFor(() => expect(runtime.exitCode).toBe(0))
      expect(runtime.exit).not.toHaveBeenCalled()
    } finally { release(); dispose(); await app.close() }
  })

  it('waits for pending analytics recording before completing close', async () => {
    let finish!: () => void
    let recording!: () => void
    const pending = new Promise<void>((resolve) => { finish = resolve })
    const started = new Promise<void>((resolve) => { recording = resolve })
    const app = buildApp({ analytics: { record: async () => { recording(); await pending } } })
    try {
      const address = await app.listen({ host: '127.0.0.1', port: 0 })
      const response = await fetch(`${address}/people?nationality=CG`)
      await response.json()
      await started
      let closed = false
      const closing = app.close().then(() => { closed = true })
      await new Promise((resolve) => setImmediate(resolve))
      expect(closed).toBe(false)
      finish()
      await closing
      expect(closed).toBe(true)
    } finally { finish(); await app.close() }
  })
})
