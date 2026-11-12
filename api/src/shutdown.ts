import type { FastifyInstance } from 'fastify'

export interface ShutdownProcess {
  on(signal: 'SIGINT' | 'SIGTERM', listener: () => void): unknown
  off(signal: 'SIGINT' | 'SIGTERM', listener: () => void): unknown
  exit(code: number): void
  exitCode?: string | number | null
}

export function installShutdown(
  app: Pick<FastifyInstance, 'close' | 'log'>,
  runtime: ShutdownProcess = process,
  timeoutMs = 10_000,
): () => void {
  let closing = false
  let deadline: ReturnType<typeof setTimeout> | undefined
  const dispose = () => {
    runtime.off('SIGTERM', shutdown)
    runtime.off('SIGINT', shutdown)
    clearTimeout(deadline)
  }
  const shutdown = () => {
    if (closing) return
    closing = true
    app.log.info('API shutdown started')
    deadline = setTimeout(() => {
      app.log.error('API shutdown deadline exceeded')
      dispose()
      runtime.exit(1)
    }, timeoutMs)
    // Keep the deadline alive while sockets, hooks or analytics are draining.
    void (async () => {
      try {
        await app.close()
        runtime.exitCode = runtime.exitCode ?? 0
        dispose()
      } catch (error) {
        app.log.error({ err: error }, 'API shutdown failed')
        dispose()
        runtime.exit(1)
      }
    })()
  }
  runtime.on('SIGTERM', shutdown)
  runtime.on('SIGINT', shutdown)
  return dispose
}
