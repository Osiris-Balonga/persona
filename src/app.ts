import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'

export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false }).withTypeProvider<TypeBoxTypeProvider>()

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

  return app
}
