import { createHash } from 'node:crypto'
import { listCountryAvailability } from './geography/country-availability.js'
import { m49RegionByCountry } from './geography/m49-region-data.js'
import { geographicDataVersion } from './geography/data-version.js'
import { portraitSelectionVersion, portraitContexts, defaultPortraitContexts, portraitContextWeights } from './portraits/contexts.js'
import type { PortraitCatalog } from './portraits/catalog.js'

function isDeliveredApproved(catalog: PortraitCatalog, asset: PortraitCatalog['assets'][number]): boolean {
  return catalog.publicBaseUrl !== null && asset.reviewStatus === 'approved' && asset.variants !== undefined
    && ['large', 'medium', 'thumbnail'].every((size) => asset.variants?.[size as 'large' | 'medium' | 'thumbnail'] !== undefined)
}

export function createPublicCoverage(catalog: PortraitCatalog) {
  const countries = listCountryAvailability().map((country) => {
    const [continentId, regionId, subregionId] = m49RegionByCountry[country.code] ?? []
    return {
      code: country.code,
      name: country.name,
      status: country.profile,
      sampledCities: country.cities,
      postcodeCities: country.citiesWithPostcode,
      phone: country.phone,
      continent: continentId ?? null,
      subregion: subregionId || regionId || null,
    }
  })
  const assets = catalog.assets.filter((asset) => isDeliveredApproved(catalog, asset))
  const annotatedAssets = assets.filter((asset) => asset.skinToneMst !== undefined)
  const body = {
    meta: {
      dataVersion: geographicDataVersion,
      catalogVersion: catalog.version,
      portraitSelectionVersion: catalog.selectionVersion ?? portraitSelectionVersion,
    },
    countries,
    portraits: {
      total: assets.length,
      annotatedSkinTone: annotatedAssets.length,
      contexts: defaultPortraitContexts.map((id) => ({
        id,
        minAge: portraitContexts[id].minimumAge,
        maxAge: portraitContexts[id].maximumAge,
        count: assets.filter((asset) => (asset.portraitContext ?? 'standard') === id).length,
        weight: portraitContextWeights[id],
      })),
      skinTones: Array.from({ length: 10 }, (_, index) => index + 1).map((value) => ({
        value,
        count: annotatedAssets.filter((asset) => asset.skinToneMst === value).length,
      })),
    },
  }
  const serialized = JSON.stringify(body)
  const etag = `"${createHash('sha256').update(serialized).digest('hex')}"`
  return { body, etag }
}
