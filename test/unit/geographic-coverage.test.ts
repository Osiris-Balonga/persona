import { describe, expect, it } from 'vitest'
import { listCoverage, validateGeographicData } from '../../src/geography/coverage.js'
import { fictionalPhone } from '../../src/geography/fictional-contact.js'
import { listCities } from '../../src/geography/cities.js'

describe('geographic source coverage', () => {
  it('marks phone coverage only when every sampled city has a reserved-range result', () => {
    const key = '0123456789abcdef'.repeat(4)
    for (const row of listCoverage().filter((entry) => entry.generation === 'eligible')) {
      const hasPhone = row.phone.status === 'ingested'
      for (const city of listCities(row.country)) {
        expect(fictionalPhone(row.country, city.name, key) !== null, `${row.country}/${city.name}`).toBe(hasPhone)
      }
    }
  })
  it('tracks each assigned code and makes incomplete product data explicit', () => {
    const rows = listCoverage()
    expect(rows).toHaveLength(249)
    expect(rows.find((row) => row.country === 'CG')).toMatchObject({
      registry: { status: 'ingested', source: 'iso-3166' },
      cities: { status: 'ingested', source: 'geonames' },
      names: { status: 'ingested', source: 'congo-senate-names', fallback: null, review: 'reviewed' },
      addresses: { status: 'partial', source: 'libaddressinput-data', fallback: expect.stringContaining('global-format') },
      distributions: { status: 'partial', source: 'persona-policy', fallback: 'uniform-country,uniform-appearance' },
    })
    expect(rows.find((row) => row.country === 'CG')?.addresses).toMatchObject({
      fallback: expect.stringContaining('synthetic-street'), supplementarySources: expect.arrayContaining(['persona-policy']),
    })
    expect(rows.find((row) => row.country === 'MW')?.addresses.supplementarySources).toContain('persona-policy')
    expect(rows.find((row) => row.country === 'FR')?.addresses).toMatchObject({
      fallback: expect.stringContaining('synthetic-street'), supplementarySources: expect.arrayContaining(['persona-policy']),
    })
    expect(rows.find((row) => row.country === 'JP')?.addresses).toMatchObject({
      fallback: expect.stringContaining('synthetic-street'), supplementarySources: expect.arrayContaining(['persona-policy']),
    })
    expect(rows.find((row) => row.country === 'BT')?.addresses.fallback).toContain('synthetic-street')
    expect(rows.find((row) => row.country === 'BR')?.addresses.fallback).toContain('synthetic-street')
    expect(rows.find((row) => row.country === 'CA')?.addresses.fallback).toContain('synthetic-street')
    expect(rows.find((row) => row.country === 'AU')?.addresses.fallback).toContain('synthetic-street')
    expect(rows.find((row) => row.country === 'PF')?.addresses.fallback).toContain('synthetic-street')
    expect(rows.find((row) => row.country === 'BN')?.addresses.fallback).toContain('street-unavailable')
    expect(rows.find((row) => row.country === 'SJ')?.addresses.fallback).toContain('street-unavailable')
    expect(rows.find((row) => row.country === 'AU')?.phone).toMatchObject({ status: 'ingested', source: 'acma-fictional-numbers' })
    expect(rows.find((row) => row.country === 'CA')?.phone).toMatchObject({ status: 'ingested', source: 'crtc-fictional-numbers' })
    expect(rows.find((row) => row.country === 'US')?.phone).toMatchObject({ status: 'ingested', source: 'nanpa' })
    for (const country of ['AG', 'AI', 'AS', 'BB', 'BM', 'BS', 'DM', 'DO', 'GD', 'GU', 'JM', 'KN',
      'KY', 'LC', 'MP', 'MS', 'PR', 'SX', 'TC', 'TT', 'VC', 'VG', 'VI']) {
      expect(rows.find((row) => row.country === country)?.phone).toMatchObject({
        status: 'ingested', source: 'nanpa', supplementarySources: ['nanpa-territory-areas'],
      })
    }
    for (const [country, source] of [
      ['FR', 'arcep-fictional-numbers'], ['DE', 'bnetza-drama-numbers'],
      ['IE', 'comreg-drama-numbers'], ['SE', 'pts-fictional-numbers'],
    ]) {
      expect(rows.find((row) => row.country === country)?.phone).toMatchObject({ status: 'ingested', source })
    }
    expect(rows.find((row) => row.country === 'CG')?.phone.status).toBe('pending')
    expect(rows.find((row) => row.country === 'AQ')).toMatchObject({
      cities: { status: 'not-applicable', source: null },
    })
    expect(rows.find((row) => row.country === 'PN')).toMatchObject({
      addresses: { supplementarySources: ['upu-pitcairn'] },
    })
    expect(rows.find((row) => row.country === 'AD')?.names).toMatchObject({
      source: 'wikidata-europe-qlever-candidates', fallback: null, supplementarySources: ['andorra-civil-names'],
    })
    expect(rows.find((row) => row.country === 'BT')?.names).toMatchObject({
      source: 'bhutan-naming-study', fallback: null,
    })
    expect(rows.find((row) => row.country === 'MW')?.names).toMatchObject({
      source: 'peace-corps-chichewa-names', fallback: null, supplementarySources: ['ifla-malawi-names'],
    })
    expect(rows.find((row) => row.country === 'ET')?.names).toMatchObject({
      source: 'tesfa-ethiopian-names', fallback: null, supplementarySources: ['uk-ethiopia-names'],
    })
    expect(rows.find((row) => row.country === 'MW')).toMatchObject({
      profileGeneration: 'available', names: { review: 'reviewed' },
    })
    for (const country of ['CG', 'GH', 'SN']) {
      expect(rows.find((row) => row.country === country)).toMatchObject({
        profileGeneration: 'available', names: { review: 'reviewed' },
      })
    }
    expect(rows.find((row) => row.country === 'ZA')).toMatchObject({
      profileGeneration: 'available', names: { source: 'stats-sa-birth-names', fallback: null, review: 'reviewed' },
    })
    expect(rows.find((row) => row.country === 'RW')).toMatchObject({
      profileGeneration: 'available', names: { source: 'wikidata-names', review: 'reviewed', fallback: null },
    })
    expect(rows.find((row) => row.country === 'UG')).toMatchObject({
      profileGeneration: 'available', names: { source: 'wikidata-africa-qlever-candidates', review: 'reviewed', fallback: null },
    })
    expect(rows.find((row) => row.country === 'KE')).toMatchObject({
      profileGeneration: 'available', names: { source: 'wikidata-africa-qlever-candidates', review: 'reviewed', fallback: null },
    })
    expect(rows.find((row) => row.country === 'NA')).toMatchObject({
      profileGeneration: 'available', names: { source: 'namibia-parliament-names', review: 'reviewed', fallback: null },
    })
    for (const [country, source] of [
      ['TZ', 'wikidata-africa-qlever-candidates'], ['ZM', 'wikidata-africa-qlever-candidates'],
      ['ZW', 'wikidata-africa-qlever-candidates'],
      ['BW', 'botswana-parliament-names'], ['LS', 'lesotho-parliament-names'], ['SC', 'seychelles-parliament-names'],
    ]) {
      expect(rows.find((row) => row.country === country)).toMatchObject({
        profileGeneration: 'available', names: { source, review: 'reviewed', fallback: null },
      })
    }
    expect(rows.find((row) => row.country === 'CG')?.addresses.fallback ?? '').not.toContain('global-street-style')
    expect(rows.find((row) => row.country === 'SN')?.addresses.fallback ?? '').not.toContain('global-street-style')
    expect(validateGeographicData()).toEqual([])
  })
})
