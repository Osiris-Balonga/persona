import { fork, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function message(child: ChildProcess, type: string): Promise<{ address: string }> {
  return new Promise((resolve, reject) => {
    const receive = (value: { type: string; address: string }) => {
      if (value.type !== type) return
      cleanup()
      resolve(value)
    }
    const fail = () => { cleanup(); reject(new Error(`Server exited before ${type}`)) }
    const cleanup = () => { child.off('message', receive); child.off('exit', fail) }
    child.on('message', receive)
    child.once('exit', fail)
  })
}

describe('server termination signals', () => {
  it.skipIf(process.platform === 'win32').each(['SIGTERM', 'SIGINT'] as const)(
    'drains a real HTTP request after %s and exits successfully', async (signal) => {
      const child = fork(fileURLToPath(new URL('../fixtures/shutdown-server.ts', import.meta.url)), [],
        { execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'inherit', 'ipc'] })
      try {
        const { address } = await message(child, 'ready')
        const started = message(child, 'started')
        const response = fetch(`${address}/slow`)
        await started
        const exited = new Promise<{ code: number | null; signal: string | null }>((resolve) => {
          child.once('exit', (code, signal) => resolve({ code, signal }))
        })
        const closing = message(child, 'closing')
        child.kill(signal)
        await closing
        // The response must complete despite receiving a termination signal.
        child.send({ type: 'release' })
        expect(await (await response).json()).toEqual({ complete: true })
        expect(await exited).toEqual({ code: 0, signal: null })
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
      }
    }, 15_000)
})
