import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { listCountries } from '../../src/geography/countries.js'
import { resolveNameProvider } from '../../src/geography/name-providers.js'
import { nameContextData } from '../../src/geography/name-context-data.js'
import { namePoolData } from '../../src/geography/name-pool-data.js'
import { geographicDataVersion } from '../../src/geography/data-version.js'
import baseline from '../fixtures/country-name-replay.json'
import { fingerprint } from '../helpers/country-name-replay.js'

describe('country name datasets', () => {
  it('pins the reviewed replay expectations to their geographic data version', () => {
    expect(geographicDataVersion).toBe(baseline.dataVersion)
  })

  it('preserves the complete fallback snapshots, including pools overridden by reviewed providers', () => {
    expect({ nameContextData: fingerprint(nameContextData), namePoolData: fingerprint(namePoolData) })
      .toEqual(baseline.snapshots)
  })

  it('matches the reviewed provider arrays, contexts, strategies and sources for this data version', () => {
    const providers = Object.fromEntries(listCountries().map(({ code }) => [
      code, fingerprint(resolveNameProvider(code) ?? null),
    ]))
    expect(providers).toEqual(baseline.providers)
  })

  it('keeps each country context and reviewed name dataset in its own directory', () => {
    for (const { code } of listCountries()) {
      const provider = resolveNameProvider(code)
      if (!provider) continue
      const directory = new URL(`../../src/geography/countries/${code}/`, import.meta.url)
      expect(existsSync(new URL('name-context.ts', directory)), `${code} name context`).toBe(true)
      if (provider.reviewed) {
        expect(existsSync(new URL('names.ts', directory)), `${code} reviewed names`).toBe(true)
      }
    }
  })
})
