import { describe, expect, it, vi } from 'vitest'
import { handleAnalyticsRequest, summarizeUsage } from '../../worker/analytics-core.js'

const secrets = {
  stagingToken: 'staging-secret', productionToken: 'production-secret', readToken: 'read-secret',
}
const request = (path: string, method: string, token?: string, body?: unknown) => new Request(`https://analytics.example.test${path}`, {
  method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

describe('private analytics Worker boundary', () => {
  it('rejects unauthenticated and private-data events before touching storage', async () => {
    const dispatch = vi.fn(async () => new Response(null, { status: 204 }))
    const event = { statusCode: 200, profileCount: 2, durationMs: 12 }
    expect((await handleAnalyticsRequest(request('/v1/events', 'POST', undefined, event), secrets, dispatch)).status).toBe(401)
    expect((await handleAnalyticsRequest(request('/v1/events', 'POST', secrets.stagingToken,
      { ...event, seed: 'must-not-be-collected' }), secrets, dispatch)).status).toBe(400)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('maps each ingestion credential to its own environment', async () => {
    const dispatch = vi.fn(async () => new Response(null, { status: 204 }))
    const event = { statusCode: 200, profileCount: 3, durationMs: 15 }
    expect((await handleAnalyticsRequest(request('/v1/events', 'POST', secrets.stagingToken, event), secrets, dispatch)).status).toBe(202)
    expect((await handleAnalyticsRequest(request('/v1/events', 'POST', secrets.productionToken, event), secrets, dispatch)).status).toBe(202)
    expect(dispatch.mock.calls.map(([environment]) => environment)).toEqual(['staging', 'production'])
    expect(dispatch.mock.calls[0][2]).toEqual(event)
  })

  it('requires the separate read credential and a bounded period for statistics', async () => {
    const dispatch = vi.fn(async () => Response.json({ points: [] }))
    const path = '/v1/stats?environment=staging&from=2026-09-27&to=2026-09-29&granularity=day'
    expect((await handleAnalyticsRequest(request(path, 'GET', secrets.stagingToken), secrets, dispatch)).status).toBe(401)
    expect((await handleAnalyticsRequest(request('/v1/stats?environment=staging&from=2020-01-01&to=2026-09-29',
      'GET', secrets.readToken), secrets, dispatch)).status).toBe(400)
    const result = await handleAnalyticsRequest(request(path, 'GET', secrets.readToken), secrets, dispatch)
    expect(result.status).toBe(200)
    expect(result.headers.get('cache-control')).toBe('no-store')
    expect(result.headers.get('access-control-allow-origin')).toBeNull()
    expect(dispatch).toHaveBeenCalledWith('staging', 'query', {
      from: '2026-09-27', to: '2026-09-29', granularity: 'day',
    })
  })

  it('aggregates hourly rows into a daily trend without losing request or profile totals', () => {
    const points = summarizeUsage([
      { hour: '2026-09-28T09:00:00Z', total: 1, successes: 1, clientErrors: 0,
        rateLimited: 0, serverErrors: 0, profiles: 3, durationSumMs: 70,
        b0: 1, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 },
      { hour: '2026-09-28T10:00:00Z', total: 1, successes: 0, clientErrors: 1,
        rateLimited: 1, serverErrors: 0, profiles: 0, durationSumMs: 180,
        b0: 0, b1: 1, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0 },
    ], 'day')
    expect(points).toEqual([{ period: '2026-09-28', requests: 2, successes: 1,
      clientErrors: 1, rateLimited: 1, serverErrors: 0, profiles: 3,
      averageLatencyMs: 125, latencyP95UpperBoundMs: 250 }])
  })
})
