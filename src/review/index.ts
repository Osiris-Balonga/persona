import { resolve } from 'node:path'
import { createReviewApp } from './server.js'

const root = resolve(process.env.PERSONA_REVIEW_ROOT ?? 'staging/portraits/review')
const port = Number(process.env.PERSONA_REVIEW_PORT ?? 4317)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Invalid review port')
const app = createReviewApp(root)
await app.listen({ host: '127.0.0.1', port })
process.stdout.write(`Portrait review: http://127.0.0.1:${port}\n`)
