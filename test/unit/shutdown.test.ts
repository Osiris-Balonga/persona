import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installShutdown } from '../../src/shutdown.js'

const setup = (close: () => Promise<void>, timeoutMs = 10_000) => {
  const runtime = Object.assign(new EventEmitter(), { exit: vi.fn(), exitCode: undefined as number | string | undefined })
  const app = { close: vi.fn(close), log: { info: vi.fn(), error: vi.fn() } }
  const dispose = installShutdown(app as Parameters<typeof installShutdown>[0], runtime, timeoutMs)
  return { runtime, app, dispose }
}

afterEach(() => vi.useRealTimers())

describe('process shutdown', () => {
  it('closes once and keeps draining after repeated termination signals', async () => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => { finish = resolve })
    const { runtime, app } = setup(() => pending)
    runtime.emit('SIGTERM')
    runtime.emit('SIGINT')
    expect(app.close).toHaveBeenCalledOnce()
    expect(runtime.exit).not.toHaveBeenCalled()
    finish()
    await pending
    await Promise.resolve()
    expect(runtime.exitCode).toBe(0)
    expect(runtime.listenerCount('SIGTERM')).toBe(0)
    expect(runtime.listenerCount('SIGINT')).toBe(0)
    expect(runtime.exit).not.toHaveBeenCalled()
  })

  it('logs a close failure and exits unsuccessfully', async () => {
    const failure = new Error('close failed')
    const { runtime, app } = setup(async () => { throw failure })
    runtime.emit('SIGINT')
    await vi.waitFor(() => expect(runtime.exit).toHaveBeenCalledWith(1))
    expect(app.log.error).toHaveBeenCalledWith({ err: failure }, 'API shutdown failed')
  })

  it('forces an unsuccessful exit at the deadline when close never finishes', async () => {
    vi.useFakeTimers()
    const { runtime, app } = setup(() => new Promise(() => {}), 2_000)
    runtime.emit('SIGTERM')
    await vi.advanceTimersByTimeAsync(1_999)
    expect(runtime.exit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(runtime.exit).toHaveBeenCalledWith(1)
    expect(app.close).toHaveBeenCalledOnce()
    expect(app.log.error).toHaveBeenCalledWith('API shutdown deadline exceeded')
  })

  it('removes only its own signal handlers when disposed', () => {
    const { runtime, app, dispose } = setup(async () => {})
    const existing = vi.fn()
    runtime.on('SIGTERM', existing)
    dispose()
    runtime.emit('SIGTERM')
    expect(existing).toHaveBeenCalledOnce()
    expect(app.close).not.toHaveBeenCalled()
  })
})
