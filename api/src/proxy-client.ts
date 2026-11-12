import { timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { IncomingHttpHeaders } from 'node:http'

export function authenticatedProxyIp(headers: IncomingHttpHeaders, token?: string): string | undefined {
  const supplied = headers['x-persona-proxy-token']
  const ip = headers['x-persona-client-ip']
  if (!token || typeof supplied !== 'string' || typeof ip !== 'string' || !isIP(ip)) return undefined
  const expected = Buffer.from(token)
  const actual = Buffer.from(supplied)
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? ip : undefined
}
