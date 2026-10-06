import { portraitVariantSizes, validatePortraitCatalog, type PortraitCatalog } from '../src/portraits/catalog.js'
import { portraitCatalog } from '../src/portraits/manifest.js'
import { matchesIfNoneMatch } from '../src/conditional-request.js'

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

export function createPortraitDelivery(catalog: PortraitCatalog) {
  const valid = catalog.publicBaseUrl !== null && validatePortraitCatalog(catalog).length === 0
  const origin = valid ? new URL(catalog.publicBaseUrl!).origin : null
  const approved = new Map<string, string>()
  if (valid) for (const asset of catalog.assets) {
    if (asset.reviewStatus !== 'approved') continue
    approved.set(asset.objectKey, asset.sha256)
    for (const size of portraitVariantSizes) {
      const variant = asset.variants?.[size]
      if (variant) approved.set(variant.objectKey, variant.sha256)
    }
  }
  return (request: Request, store: PortraitStore) => deliverPortrait(request, store, origin, approved)
}

export async function handlePortraitRequest(
  request: Request, store: PortraitStore, catalog: PortraitCatalog,
): Promise<Response> {
  return createPortraitDelivery(catalog)(request, store)
}

async function deliverPortrait(request: Request, store: PortraitStore, origin: string | null,
  approved: ReadonlyMap<string, string>): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } })
  }
  if (origin === null) return notFound()
  const url = new URL(request.url)
  if (url.origin !== origin || url.search || url.hash) return notFound()
  const key = url.pathname.slice(1)
  const expectedHash = approved.get(key)
  if (expectedHash === undefined) return notFound()

  try {
    const object = request.method === 'HEAD' ? await store.head(key) : await store.get(key)
    if (object === null || object.size < 1 || object.size >= 50_000 ||
      object.customMetadata?.sha256 !== expectedHash ||
      (request.method === 'GET' && object.body === undefined)) return notFound()
    const headers = new Headers({
      'Content-Type': 'image/webp',
      'Content-Length': String(object.size),
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'ETag': object.httpEtag,
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    })
    if (matchesIfNoneMatch(request.headers.get('if-none-match'), object.httpEtag)) {
      headers.delete('Content-Length')
      return new Response(null, { status: 304, headers })
    }
    return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers })
  } catch {
    return new Response('Service Unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

// The versioned manifest is static for this isolate. A withdrawal deploy creates
// a fresh approved-key snapshot; mutable review catalogues use a fresh factory.
const productionDelivery = createPortraitDelivery(portraitCatalog)

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return productionDelivery(request, {
      get: (key) => env.PORTRAITS.get(key),
      head: (key) => env.PORTRAITS.head(key),
    })
  },
}
