type UploadedObject = { size: number; customMetadata?: Record<string, string> }
type UploadStore = {
  head(key: string): Promise<UploadedObject | null>
  put(key: string, bytes: Uint8Array, options: {
    httpMetadata: { contentType: string }; customMetadata: { sha256: string }; sha256: string
  }): Promise<UploadedObject | null>
}

const reply = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } })

export async function handlePortraitUpload(request: Request, store: UploadStore): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return reply(403)
  if (request.method !== 'PUT') return reply(405)
  const key = decodeURIComponent(url.pathname.slice(1))
  const expected = request.headers.get('X-Portrait-Sha256') ?? ''
  if (!/^portraits\/[a-z][a-z0-9-]*\/p_\d{4,}\.webp$/.test(key) || url.search
    || !/^[a-f0-9]{64}$/.test(expected) || request.headers.get('Content-Type') !== 'image/webp') return reply(400)
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.length < 1 || bytes.length >= 50_000) return reply(422)
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((part) => part.toString(16).padStart(2, '0')).join('')
  if (actual !== expected) return reply(422)
  const existing = await store.head(key)
  if (existing !== null) return reply(existing.size === bytes.length
    && existing.customMetadata?.sha256 === expected ? 200 : 409)
  const result = await store.put(key, bytes, {
    httpMetadata: { contentType: 'image/webp' }, customMetadata: { sha256: expected }, sha256: expected,
  })
  return reply(result?.size === bytes.length && result.customMetadata?.sha256 === expected ? 201 : 502)
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handlePortraitUpload(request, env.PORTRAITS)
  },
}
