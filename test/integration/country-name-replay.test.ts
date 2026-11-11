import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import baseline from '../fixtures/country-name-replay.json'
import { batchReplayQueries, countryResponseFingerprint, fingerprint } from '../helpers/country-name-replay.js'

describe('versioned country name replay', () => {
  it.each(Object.entries(baseline.responses))('replays complete profiles for %s across both genders and every age group', (country, expected) => {
    expect(countryResponseFingerprint(country)).toBe(expected)
  })

  it('preserves HTTP bodies and ETags for large batches, cross-border residence and field projections', async () => {
    const app = buildApp({ rateLimitMax: 1000 })
    try {
      for (const url of batchReplayQueries) {
        const response = await app.inject({ url })
        expect({ status: response.statusCode, body: fingerprint(response.body), etag: response.headers.etag }, url)
          .toEqual(baseline.http[url as keyof typeof baseline.http])
      }
    } finally { await app.close() }
  })
})
