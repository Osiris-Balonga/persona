import { validatePortraitCatalog, type PortraitCatalog } from '../src/portraits/catalog.js'
import { portraitCatalog } from '../src/portraits/manifest.js'

type StoredPortrait = {
  size: number
  httpEtag: string
  customMetadata?: Record<string, string>
  body?: ReadableStream<Uint8Array>
}

type PortraitStore = {
  get(key: string): Promise<StoredPortrait | null>
  head(key: string): Promise<StoredPortrait | null>
}

const notFound = () => new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } })

export async function handlePortraitRequest(
  request: Request, store: PortraitStore, catalog: PortraitCatalog,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } })
  }
  if (catalog.publicBaseUrl === null || validatePortraitCatalog(catalog).length) return notFound()
  const url = new URL(request.url)
  if (url.origin !== new URL(catalog.publicBaseUrl).origin || url.search || url.hash) return notFound()
  const key = url.pathname.slice(1)
  const asset = catalog.assets.find((candidate) => candidate.reviewStatus === 'approved' && candidate.objectKey === key)
  if (asset === undefined) return notFound()

  try {
    const object = request.method === 'HEAD' ? await store.head(key) : await store.get(key)
    if (object === null || object.size < 1 || object.size >= 50_000 ||
      object.customMetadata?.sha256 !== asset.sha256 ||
      (request.method === 'GET' && object.body === undefined)) return notFound()
    const headers = new Headers({
      'Content-Type': 'image/webp',
      'Content-Length': String(object.size),
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'ETag': object.httpEtag,
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    })
    const validators = request.headers.get('if-none-match')?.split(',').map((value) => value.trim()) ?? []
    if (validators.includes(object.httpEtag) || validators.includes('*')) {
      headers.delete('Content-Length')
      return new Response(null, { status: 304, headers })
    }
    return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers })
  } catch {
    return new Response('Service Unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handlePortraitRequest(request, {
      get: (key) => env.PORTRAITS.get(key),
      head: (key) => env.PORTRAITS.head(key),
    }, portraitCatalog)
  },
}
