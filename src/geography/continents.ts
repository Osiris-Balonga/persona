import { m49RegionByCountry } from './m49-region-data.js'

export type Continent = 'africa' | 'americas' | 'asia' | 'europe' | 'oceania'

const continentByM49: Readonly<Record<string, Continent>> = {
  '002': 'africa', '019': 'americas', '142': 'asia',
  '150': 'europe', '009': 'oceania',
}

export function continentForCountry(countryCode: string): Continent | undefined {
  const region = m49RegionByCountry[countryCode]?.[0]
  return region === undefined ? undefined : continentByM49[region]
}
