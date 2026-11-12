import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

async function unusedPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test port')
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return address.port
}

describe('compiled production entry point', () => {
  it('serves HTTP when loaded by a CommonJS process supervisor', async () => {
    execFileSync(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'])
    const port = await unusedPort()
    const script = `
      require(${JSON.stringify(resolve('dist/index.js'))});
      const deadline = Date.now() + 5000;
      async function verify() {
        while (Date.now() < deadline) {
          try {
            const response = await fetch('http://127.0.0.1:${port}/health');
            if (response.status !== 200) throw new Error('Unexpected health status ' + response.status);
            console.log('HOSTED_HEALTH=' + JSON.stringify(await response.json()));
            process.exit(0);
          } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
        }
        throw new Error('Hosted entry did not become healthy');
      }
      verify().catch(error => { console.error(error); process.exit(1); });
    `
    const output = execFileSync(process.execPath, ['--input-type=commonjs', '-e', script], {
      env: { ...process.env, NODE_ENV: 'test', PORT: String(port), RENDER: '', ANALYTICS_INGEST_URL: '', ANALYTICS_INGEST_TOKEN: '' },
      timeout: 10_000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const health = output.split('\n').find(line => line.startsWith('HOSTED_HEALTH='))
    expect(JSON.parse(health?.slice('HOSTED_HEALTH='.length) ?? 'null')).toEqual({ status: 'ok' })
  }, 20_000)
})
