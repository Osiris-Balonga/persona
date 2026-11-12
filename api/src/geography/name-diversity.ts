import { listCountries } from './countries.js'
import { resolveNameProvider, type NameProvider } from './name-providers.js'
import { geographicSources } from './sources.js'

const genders = ['female', 'male'] as const
const canonical = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase()

export function summarizeNameDiversity(provider: NameProvider) {
  const given = { female: new Set<string>(), male: new Set<string>() }
  const second = { female: new Set<string>(), male: new Set<string>() }
  const combinations = { female: new Set<string>(), male: new Set<string>() }
  const strategies = new Set<string>()
  const issues = new Set<string>()

  function labels(values: readonly string[], field: string): string[] {
    const normalized = values.map(canonical)
    if (values.length === 0) issues.add(`${field}: empty pool`)
    if (normalized.some(name => !name)) issues.add(`${field}: empty label`)
    if (new Set(normalized).size !== normalized.length) issues.add(`${field}: duplicate labels`)
    return [...new Set(normalized.filter(Boolean))]
  }

  for (const pool of provider.context.pools) {
    if (pool.weight <= 0) continue
    const components = provider.pools[pool.locale]
    if (!components) {
      issues.add(`${pool.locale}: missing pool`)
      continue
    }
    strategies.add(components.strategy)
    for (const gender of genders) {
      const firstNames = labels(components.given[gender], `${pool.locale}/${gender}/given`)
      firstNames.forEach(name => given[gender].add(name))
      if (components.strategy === 'full-name') {
        for (const name of firstNames) {
          if (!name.includes(' ')) {
            issues.add(`${pool.locale}/${gender}: full name needs two display components`)
            continue
          }
          combinations[gender].add(name)
        }
      } else {
        const secondNames = labels(components.second[gender], `${pool.locale}/${gender}/second`)
        secondNames.forEach(name => second[gender].add(name))
        for (const first of firstNames) {
          for (const last of secondNames) {
            if (components.strategy !== 'patronymic' || first !== last) {
              combinations[gender].add(`${first} ${last}`)
            }
          }
        }
      }
      if (combinations[gender].size === 0) issues.add(`${pool.locale}/${gender}: no valid combinations`)
    }
  }

  const statistics = (gender: typeof genders[number]) => ({
    given: given[gender].size,
    second: second[gender].size,
    combinations: combinations[gender].size,
  })
  return {
    female: statistics('female'), male: statistics('male'),
    minimumCombinations: Math.min(combinations.female.size, combinations.male.size),
    strategies: [...strategies], issues: [...issues],
  }
}

export function listCountryNameDiversity() {
  return listCountries().flatMap(country => {
    const provider = resolveNameProvider(country.code)
    if (country.generation !== 'eligible' || !provider?.reviewed) return []
    return [{ country: country.code, name: country.name,
      sources: [provider.source, ...provider.supplementarySources].map(id => ({ id, ...geographicSources[id] })),
      ...summarizeNameDiversity(provider) }]
  }).sort((first, second) => first.minimumCombinations - second.minimumCombinations
    || first.country.localeCompare(second.country))
}
