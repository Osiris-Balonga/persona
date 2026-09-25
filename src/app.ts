import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'
import { PeopleQueryError, parsePeopleQuery } from './people-query.js'
import { peopleCacheHeaders } from './cache-policy.js'
import { geographicDataVersion } from './geography/data-version.js'
import { projectPeopleResponse } from './field-selection.js'
import { generatePeopleResponse } from './generate-people.js'
import { validatePortraitCatalog, type PortraitCatalog } from './portraits/catalog.js'
import { portraitCatalog } from './portraits/manifest.js'

export function buildApp(options: { logger?: boolean; portraitCatalog?: PortraitCatalog } = {}) {
  const catalog = options.portraitCatalog ?? portraitCatalog
  const catalogErrors = validatePortraitCatalog(catalog)
  if (catalogErrors.length) throw new Error(`Invalid portrait catalog: ${catalogErrors.join('; ')}`)
  const app = Fastify({ logger: options.logger ?? false }).withTypeProvider<TypeBoxTypeProvider>()

  app.addHook('onSend', async (_request, reply, payload) => {
    if (reply.statusCode >= 400) reply.header('Cache-Control', 'no-store')
    return payload
  })

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

  return app
}
