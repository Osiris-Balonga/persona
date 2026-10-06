import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { buildApp } from '../src/app.js'
import { geographicDataVersion } from '../src/geography/data-version.js'
import { portraitCatalog } from '../src/portraits/manifest.js'
import portraitWorker from '../worker/portrait-worker.js'

const iterations = Number(process.argv[2] ?? 20)
if (!Number.isSafeInteger(iterations) || iterations < 5 || iterations > 1_000) {
  throw new Error('Expected 5–1000 measured iterations')
}
const reports: unknown[] = []
async function measure(name: string, operation: () => Promise<string>) {
  for (let index = 0; index < 3; index++) await operation()
  const times: number[] = []
  const heapBefore = process.memoryUsage().heapUsed
  let body = ''
  for (let index = 0; index < iterations; index++) {
    const start = performance.now()
    body = await operation()
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  const rounded = (value: number) => Math.round(value * 100) / 100
  reports.push({ name, iterations, medianMs: rounded(times[Math.floor(times.length / 2)]),
    p95Ms: rounded(times[Math.ceil(times.length * 0.95) - 1]),
    meanMs: rounded(times.reduce((sum, value) => sum + value, 0) / times.length),
    heapDeltaBytes: process.memoryUsage().heapUsed - heapBefore,
    responseSha256: createHash('sha256').update(body).digest('hex') })
}

const app = buildApp({ rateLimitMax: 100_000 })
try {
  for (const country of ['CG', 'FR', 'MW']) {
    for (const count of [1, 100]) {
      const url = `/people?nationality=${country}&ageGroup=adult&seed=benchmark&asOf=2026-01-01&count=${count}`
      await measure(`api ${country} count=${count}`, async () => {
        const response = await app.inject({ url })
        if (response.statusCode !== 200) throw new Error(`Benchmark request failed: ${response.statusCode}`)
        return response.body
      })
    }
  }
  const asset = portraitCatalog.assets.find((item) => item.reviewStatus === 'approved')
  if (!asset || !portraitCatalog.publicBaseUrl) throw new Error('Benchmark needs an approved catalogue')
  const stored = () => ({ size: 13, httpEtag: '"benchmark"', customMetadata: { sha256: asset.sha256 },
    body: new Response('fixture-bytes').body! })
  const store = { get: async () => stored(), head: async () => stored() }
  for (const method of ['GET', 'HEAD']) {
    await measure(`portrait ${method} local store`, async () => {
      const response = await portraitWorker.fetch(new Request(`${portraitCatalog.publicBaseUrl}/${asset.objectKey}`,
        { method }), { PORTRAITS: store } as unknown as Parameters<typeof portraitWorker.fetch>[1])
      if (response.status !== 200) throw new Error(`Portrait benchmark failed: ${response.status}`)
      return await response.text()
    })
  }
} finally { await app.close() }

console.log(JSON.stringify({ node: process.version, platform: process.platform,
  dataVersion: geographicDataVersion, catalogVersion: portraitCatalog.version,
  portraitCount: portraitCatalog.assets.length, warmupIterations: 3,
  scope: 'Node API injection including serialization; portrait handler with local storage fixture, excluding workerd/R2/network latency',
  memoryNote: 'Heap delta includes GC and is observational, not peak memory or a pass/fail gate', reports }, null, 2))
