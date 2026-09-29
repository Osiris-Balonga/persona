import { type Appearance } from './appearance.js'
import { getCountry } from './countries.js'
import { m49RegionByCountry } from './m49-region-data.js'

type WeightedAppearance = { value: Appearance; weight: number }
type DistributionBasis = 'country-review' | 'regional-inference'

export interface CountryAppearanceDistribution {
  country: string
  basis: DistributionBasis
  references: readonly string[]
  weights: readonly WeightedAppearance[]
}

// Relative editorial weights, not population percentages. The M49 grouping supplies
// a geographic starting point; country evidence can replace it as it is reviewed.
const regionalWeights: Record<string, readonly WeightedAppearance[]> = {
  '002-015': [
    { value: 'north-african', weight: 10 }, { value: 'middle-eastern', weight: 3 },
    { value: 'black', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '002-011': [
    { value: 'west-african', weight: 10 }, { value: 'black', weight: 4 },
    { value: 'mixed', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '002-017': [
    { value: 'central-african', weight: 10 }, { value: 'black', weight: 4 },
    { value: 'mixed', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '002-014': [
    { value: 'east-african', weight: 10 }, { value: 'black', weight: 3 },
    { value: 'middle-eastern', weight: 1 }, { value: 'south-asian', weight: 1 },
    { value: 'european', weight: 1 },
  ],
  '002-018': [
    { value: 'southern-african', weight: 9 }, { value: 'black', weight: 4 },
    { value: 'european', weight: 2 }, { value: 'mixed', weight: 1 },
  ],
  '150-151': [
    { value: 'european', weight: 12 }, { value: 'black', weight: 1 },
    { value: 'middle-eastern', weight: 1 }, { value: 'mixed', weight: 1 },
  ],
  '150-154': [
    { value: 'european', weight: 12 }, { value: 'black', weight: 2 },
    { value: 'middle-eastern', weight: 1 }, { value: 'south-asian', weight: 1 },
    { value: 'east-asian', weight: 1 }, { value: 'mixed', weight: 1 },
  ],
  '150-039': [
    { value: 'european', weight: 11 }, { value: 'north-african', weight: 2 },
    { value: 'black', weight: 1 }, { value: 'middle-eastern', weight: 1 },
    { value: 'mixed', weight: 1 },
  ],
  '150-155': [
    { value: 'european', weight: 11 }, { value: 'black', weight: 2 },
    { value: 'north-african', weight: 1 }, { value: 'middle-eastern', weight: 1 },
    { value: 'south-asian', weight: 1 }, { value: 'east-asian', weight: 1 },
    { value: 'mixed', weight: 1 },
  ],
  '142-143': [
    { value: 'middle-eastern', weight: 5 }, { value: 'east-asian', weight: 4 },
    { value: 'european', weight: 2 }, { value: 'south-asian', weight: 1 },
  ],
  '142-030': [
    { value: 'east-asian', weight: 12 }, { value: 'european', weight: 1 },
    { value: 'mixed', weight: 1 }, { value: 'black', weight: 1 },
  ],
  '142-035': [
    { value: 'southeast-asian', weight: 10 }, { value: 'east-asian', weight: 2 },
    { value: 'south-asian', weight: 2 }, { value: 'mixed', weight: 1 },
    { value: 'black', weight: 1 },
  ],
  '142-034': [
    { value: 'south-asian', weight: 12 }, { value: 'middle-eastern', weight: 1 },
    { value: 'black', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '142-145': [
    { value: 'middle-eastern', weight: 9 }, { value: 'south-asian', weight: 2 },
    { value: 'black', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '019-021': [
    { value: 'european', weight: 8 }, { value: 'black', weight: 3 },
    { value: 'latin-american', weight: 3 }, { value: 'mixed', weight: 2 },
    { value: 'east-asian', weight: 1 }, { value: 'south-asian', weight: 1 },
  ],
  '019-029': [
    { value: 'black', weight: 7 }, { value: 'latin-american', weight: 5 },
    { value: 'mixed', weight: 4 }, { value: 'european', weight: 2 },
    { value: 'south-asian', weight: 1 }, { value: 'east-asian', weight: 1 },
  ],
  '019-013': [
    { value: 'latin-american', weight: 9 }, { value: 'mixed', weight: 3 },
    { value: 'european', weight: 2 }, { value: 'black', weight: 2 },
  ],
  '019-005': [
    { value: 'latin-american', weight: 8 }, { value: 'mixed', weight: 3 },
    { value: 'european', weight: 3 }, { value: 'black', weight: 2 },
    { value: 'east-asian', weight: 1 },
  ],
  '009-053': [
    { value: 'european', weight: 8 }, { value: 'pacific-islander', weight: 4 },
    { value: 'mixed', weight: 2 }, { value: 'east-asian', weight: 2 },
    { value: 'south-asian', weight: 1 }, { value: 'black', weight: 1 },
  ],
  '009-054': [
    { value: 'pacific-islander', weight: 11 }, { value: 'mixed', weight: 2 },
    { value: 'east-asian', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '009-057': [
    { value: 'pacific-islander', weight: 11 }, { value: 'mixed', weight: 2 },
    { value: 'east-asian', weight: 1 }, { value: 'european', weight: 1 },
  ],
  '009-061': [
    { value: 'pacific-islander', weight: 11 }, { value: 'mixed', weight: 2 },
    { value: 'east-asian', weight: 1 }, { value: 'european', weight: 1 },
  ],
}

const countryReviews: Record<string, Pick<CountryAppearanceDistribution, 'references' | 'weights'>> = {
  FR: {
    references: ['https://www.insee.fr/fr/statistiques/8612512'],
    weights: [
      { value: 'european', weight: 18 }, { value: 'north-african', weight: 2 },
      { value: 'west-african', weight: 1 }, { value: 'central-african', weight: 1 },
      { value: 'black', weight: 1 }, { value: 'mixed', weight: 1 },
      { value: 'middle-eastern', weight: 1 }, { value: 'east-asian', weight: 1 },
    ],
  },
  US: {
    references: ['https://www.census.gov/quickfacts/fact/table/US/PST045224'],
    weights: [
      { value: 'european', weight: 8 }, { value: 'black', weight: 3 },
      { value: 'latin-american', weight: 3 }, { value: 'mixed', weight: 2 },
      { value: 'east-asian', weight: 2 }, { value: 'south-asian', weight: 1 },
      { value: 'pacific-islander', weight: 1 },
    ],
  },
  GB: {
    references: ['https://www.ons.gov.uk/peoplepopulationandcommunity/culturalidentity/ethnicity/bulletins/ethnicgroupenglandandwales/census2021'],
    weights: [
      { value: 'european', weight: 10 }, { value: 'south-asian', weight: 2 },
      { value: 'black', weight: 1 }, { value: 'mixed', weight: 1 },
      { value: 'east-asian', weight: 1 }, { value: 'middle-eastern', weight: 1 },
    ],
  },
  BR: {
    references: ['https://educa.ibge.gov.br/jovens/conheca-o-brasil/populacao/18319-cor-ou-raca.html'],
    weights: [
      { value: 'latin-american', weight: 8 }, { value: 'mixed', weight: 5 },
      { value: 'european', weight: 4 }, { value: 'black', weight: 3 },
      { value: 'east-asian', weight: 1 },
    ],
  },
  CA: {
    references: ['https://www150.statcan.gc.ca/n1/daily-quotidien/221026/dq221026b-eng.htm'],
    weights: [
      { value: 'european', weight: 10 }, { value: 'south-asian', weight: 2 },
      { value: 'east-asian', weight: 2 }, { value: 'black', weight: 1 },
      { value: 'mixed', weight: 1 }, { value: 'middle-eastern', weight: 1 },
      { value: 'southeast-asian', weight: 1 },
    ],
  },
  ZA: {
    references: ['https://www.statssa.gov.za/?p=16716'],
    weights: [
      { value: 'southern-african', weight: 9 }, { value: 'black', weight: 6 },
      { value: 'mixed', weight: 2 }, { value: 'european', weight: 2 },
      { value: 'south-asian', weight: 1 },
    ],
  },
  SG: {
    references: ['https://www.singstat.gov.sg/publication-resources/population-trends-2026'],
    weights: [
      { value: 'east-asian', weight: 11 }, { value: 'southeast-asian', weight: 3 },
      { value: 'south-asian', weight: 2 }, { value: 'mixed', weight: 1 },
      { value: 'european', weight: 1 },
    ],
  },
  MU: {
    references: ['https://mauritius-canberra.govmu.org/Pages/Diplomatic%20Relations/General-Information-about-the-Republic-of-Mauritius.aspx'],
    weights: [
      { value: 'south-asian', weight: 7 }, { value: 'mixed', weight: 4 },
      { value: 'black', weight: 3 }, { value: 'european', weight: 2 },
      { value: 'east-asian', weight: 1 },
    ],
  },
  GY: {
    references: ['https://statisticsguyana.gov.gy/wp-content/uploads/2019/10/Final_2012_Census_Compendium2.pdf'],
    weights: [
      { value: 'south-asian', weight: 7 }, { value: 'black', weight: 5 },
      { value: 'mixed', weight: 5 }, { value: 'latin-american', weight: 2 },
      { value: 'european', weight: 1 },
    ],
  },
  QA: {
    references: [
      'https://www.npc.qa/en/statistics/census2020/results/Pages/population.aspx',
      'https://www.nhrc-qa.org/storage/annualReports/file_643fe99ca8a34_1681910172.pdf',
    ],
    weights: [
      { value: 'south-asian', weight: 9 }, { value: 'middle-eastern', weight: 5 },
      { value: 'southeast-asian', weight: 3 }, { value: 'black', weight: 2 },
      { value: 'european', weight: 1 },
    ],
  },
}

export function appearanceDistributionForCountry(code: string): CountryAppearanceDistribution {
  const country = getCountry(code)
  if (!country || country.generation !== 'eligible') throw new RangeError('Unavailable appearance distribution country')
  const review = countryReviews[code]
  if (review) return { country: code, basis: 'country-review', ...review }
  const region = m49RegionByCountry[code]
  const subregion = region && (region[1] === '202' || region[1] === '419' ? region[2] : region[1])
  const weights = region && regionalWeights[`${region[0]}-${subregion}`]
  if (!weights) throw new RangeError(`Missing appearance distribution for ${code}`)
  return {
    country: code,
    basis: 'regional-inference',
    references: ['https://unstats.un.org/unsd/methodology/m49/overview/'],
    weights,
  }
}
