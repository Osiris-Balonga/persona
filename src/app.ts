import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'
import { PeopleQueryError, parsePeopleQuery } from './people-query.js'
import { peopleCacheHeaders } from './cache-policy.js'
import { geographicDataVersion } from './geography/data-version.js'
import { projectPeopleResponse } from './field-selection.js'
import { generatePeopleResponse } from './generate-people.js'
import { validatePortraitCatalog, type PortraitCatalog } from './portraits/catalog.js'
import { portraitCatalog } from './portraits/manifest.js'

export interface AppOptions {
  logger?: boolean
  portraitCatalog?: PortraitCatalog
  trustedProxies?: string
  requireHttps?: boolean
  rateLimitMax?: number
  maxResponseBytes?: number
}

export function buildApp(options: AppOptions = {}) {
  const catalog = options.portraitCatalog ?? portraitCatalog
  const catalogErrors = validatePortraitCatalog(catalog)
  if (catalogErrors.length) throw new Error(`Invalid portrait catalog: ${catalogErrors.join('; ')}`)
  const app = Fastify({
    logger: options.logger ? { serializers: { req: (request) => ({ method: request.method }),
      res: (reply) => ({ statusCode: reply.statusCode }) } } : false,
    trustProxy: options.trustedProxies ?? false,
    bodyLimit: 1_024,
  }).withTypeProvider<TypeBoxTypeProvider>()

  app.addHook('onRequest', async (request, reply) => {
    if (options.requireHttps && request.protocol !== 'https') {
      return reply.code(403).send({ error: { code: 'HTTPS_REQUIRED', message: 'HTTPS is required' } })
    }
    if ((request.method === 'GET' || request.method === 'HEAD') &&
      (Number(request.headers['content-length'] ?? 0) > 0 || request.headers['transfer-encoding'] !== undefined)) {
      return reply.code(400).send({ error: { code: 'UNEXPECTED_BODY', message: 'Request body is not supported' } })
    }
  })

  void app.register(cors, { origin: '*', methods: ['GET', 'HEAD'], allowedHeaders: ['If-None-Match'],
    exposedHeaders: ['ETag', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'] })
  void app.register(rateLimit, { max: options.rateLimitMax ?? 30, timeWindow: '1 minute',
    errorResponseBuilder: () => ({ statusCode: 429, error: { code: 'RATE_LIMITED', message: 'Too many requests; try again later' } }),
  })

  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500
    if (statusCode === 429) {
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests; try again later' } })
    }
    if (statusCode === 413) {
      return reply.code(413).send({ error: { code: 'REQUEST_TOO_LARGE', message: 'Request body is too large' } })
    }
    request.log.error({ err: error }, 'Request failed')
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Unable to process request' } })
  })

  app.setNotFoundHandler((request, reply) => {
    if (request.url.split('?')[0] === '/people' || request.url.split('?')[0] === '/health') {
      return reply.code(405).header('Allow', 'GET, HEAD, OPTIONS').send({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
    }
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })

  app.addHook('onSend', async (_request, reply, payload) => {
    if (reply.statusCode < 400 && (typeof payload === 'string' || Buffer.isBuffer(payload)) &&
      Buffer.byteLength(payload) > (options.maxResponseBytes ?? 256 * 1_024)) {
      reply.code(503).header('Cache-Control', 'no-store').removeHeader('ETag')
      return JSON.stringify({ error: { code: 'RESPONSE_TOO_LARGE', message: 'Response exceeds the service limit' } })
    }
    if (reply.statusCode >= 400) reply.header('Cache-Control', 'no-store')
    return payload
  })

  app.after(() => {
  app.get('/health', {
    schema: {
      response: {
        200: Type.Object({ status: Type.Literal('ok') }),
      },
    },
  }, (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    return { status: 'ok' as const }
  })

  app.get('/people', (request, reply) => {
    try {
      const params = new URL(request.raw.url ?? '/people', 'http://localhost').searchParams
      const query = parsePeopleQuery(params)
      const headers = peopleCacheHeaders(200, query, params.has('asOf'), {
        dataVersion: geographicDataVersion, catalogVersion: catalog.version,
      })
      reply.header('Cache-Control', headers['Cache-Control'])
      if (headers.ETag !== undefined) {
        reply.header('ETag', headers.ETag)
        const validators = request.headers['if-none-match']?.split(',').map((value) => value.trim()) ?? []
        if (validators.includes(headers.ETag) || validators.includes('*')) return reply.code(304).send()
      }
      const response = generatePeopleResponse(query, catalog)
      return query.fields === undefined ? response : projectPeopleResponse(response, query.fields)
    } catch (error) {
      if (error instanceof PeopleQueryError) {
        return reply.code(error.statusCode).send({ error: {
          code: error.code, message: error.message, parameter: error.parameter,
        } })
      }
      request.log.error({ err: error }, 'People generation failed')
      return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Unable to generate people' } })
    }
  })
  })

  return app
}
