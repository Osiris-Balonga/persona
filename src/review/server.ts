import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import Fastify from 'fastify'
import { appearanceCategories } from '../geography/appearance.js'
import { PortraitReviewStore, type PortraitMetadata, type ReviewDecision } from './store.js'
import { portraitAgeRanges } from './age-ranges.js'

const pageRoot = join(process.cwd(), 'review')
function localOrigin(value: unknown): boolean {
  if (value === undefined) return true
  if (typeof value !== 'string') return false
  try { return ['localhost', '127.0.0.1'].includes(new URL(value).hostname) }
  catch { return false }
}
export function createReviewApp(root: string) {
  const app = Fastify({ bodyLimit: 20_000_000, logger: false })
  const store = new PortraitReviewStore(root)
  let scanning = false
  const timer = setInterval(async () => {
    if (scanning) return
    scanning = true
    try { await store.processInbox() } catch (error) { app.log.error(error) }
    finally { scanning = false }
  }, 5000)
  timer.unref()
  app.addHook('onClose', async () => clearInterval(timer))
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_request, body, done) => done(null, body))
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET' && !localOrigin(request.headers.origin)) {
      await reply.code(403).send({ error: 'Local origin required' })
    }
  })
  app.get('/', async (_request, reply) => reply.type('text/html; charset=utf-8').send(await readFile(join(pageRoot, 'index.html'))))
  app.get('/app.css', async (_request, reply) => reply.type('text/css; charset=utf-8').send(await readFile(join(pageRoot, 'app.css'))))
  app.get('/app.js', async (_request, reply) => reply.type('text/javascript; charset=utf-8').send(await readFile(join(pageRoot, 'app.js'))))
  app.get('/gallery-filters.js', async (_request, reply) => reply.type('text/javascript; charset=utf-8').send(await readFile(join(pageRoot, 'gallery-filters.js'))))
  app.get('/api/options', async () => ({ appearanceCategories, portraitAgeRanges }))
  app.get('/api/items', async () => store.list())
  app.get<{ Params: { id: string } }>('/api/items/:id/image', async (request, reply) => {
    try { return reply.type('image/webp').header('cache-control', 'no-store').send(await store.image(request.params.id)) }
    catch { return reply.code(404).send({ error: 'Image unavailable' }) }
  })
  app.post('/api/upload', async (request, reply) => {
    if (!Buffer.isBuffer(request.body)) return reply.code(415).send({ error: 'Upload an image file' })
    const name = request.headers['x-file-name']
    if (typeof name !== 'string' || !name.trim()) return reply.code(400).send({ error: 'File name required' })
    try { return reply.code(201).send(await store.ingest(request.body, decodeURIComponent(name))) }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : 'Upload failed' }) }
  })
  app.post<{ Params: { id: string }; Body: PortraitMetadata }>('/api/items/:id/metadata', async (request, reply) => {
    try { return await store.setMetadata(request.params.id, request.body) }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid metadata' }) }
  })
  app.post<{ Params: { id: string }; Body: Omit<ReviewDecision, 'at'> }>('/api/items/:id/decision', async (request, reply) => {
    try { return await store.decide(request.params.id, request.body) }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : 'Decision failed' }) }
  })
  app.post<{ Params: { id: string } }>('/api/items/:id/reopen', async (request, reply) => {
    try { return await store.reopen(request.params.id) }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : 'Reopen failed' }) }
  })
  app.post<{ Body: { ids: string[] } & Omit<ReviewDecision, 'at'> }>('/api/decisions', async (request, reply) => {
    try { return await store.decideMany(request.body?.ids, request.body) }
    catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid bulk decision' }) }
  })
  return app
}
