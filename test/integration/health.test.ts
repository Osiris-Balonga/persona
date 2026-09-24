import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'

describe('health endpoint', () => {
  it('reports readiness without credentials', async () => {
    const app = buildApp()
    try {
      const response = await app.inject({ method: 'GET', url: '/health' })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ok' })
    } finally {
      await app.close()
    }
  })
})
