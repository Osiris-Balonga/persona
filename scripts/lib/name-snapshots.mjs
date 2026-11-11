import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const nameSnapshotHeader = '// GeoNames countryInfo.txt (CC BY 4.0), @faker-js/faker 10.6.0 (MIT), and reviewed Georgian given-name statistics; see docs/geographic-data.md.\n'
const contextType = "export type NameContext = { pools: readonly { locale: string; tier: 'local' | 'language' | 'global'; weight: number }[]; fallback: 'local' | 'language' | 'global' }"
const poolType = 'export type NamePool = { female: readonly string[]; male: readonly string[]; lastFemale: readonly string[]; lastMale: readonly string[] }'

function poolLiteral(pool) {
  const fields = Object.entries(pool).map(([field, names]) => {
    const lines = []
    for (let index = 0; index < names.length; index += 8) {
      lines.push(`    ${names.slice(index, index + 8).map(name => JSON.stringify(name)).join(', ')},`)
    }
    return `  ${field}: [\n${lines.join('\n')}\n  ],`
  })
  return `{\n${fields.join('\n')}\n}`
}

// Country contexts and shared locale pools have distinct ownership. Refreshes never
// write countries/<ISO>/names.ts, which contains separately reviewed local samples.
export function writeNameSnapshots(directory, contexts, pools) {
  const contextImports = []
  const contextEntries = []
  for (const [country, context] of Object.entries(contexts)) {
    const countryDirectory = join(directory, 'countries', country)
    mkdirSync(countryDirectory, { recursive: true })
    writeFileSync(join(countryDirectory, 'name-context.ts'),
      `${nameSnapshotHeader}import type { NameContext } from '../../name-context-data.js'\n\nexport const nameContext: NameContext = ${JSON.stringify(context)}\n`)
    contextImports.push(`import { nameContext as ${country} } from './countries/${country}/name-context.js'`)
    contextEntries.push(`  ${country},`)
  }
  writeFileSync(join(directory, 'name-context-data.ts'),
    `${nameSnapshotHeader}${contextImports.join('\n')}\n\n${contextType}\n\nexport const nameContextData: Record<string, NameContext> = {\n${contextEntries.join('\n')}\n}\n`)

  const poolDirectory = join(directory, 'name-pools')
  mkdirSync(poolDirectory, { recursive: true })
  const poolImports = []
  const poolEntries = []
  for (const [locale, pool] of Object.entries(pools)) {
    writeFileSync(join(poolDirectory, `${locale}.ts`),
      `${nameSnapshotHeader}import type { NamePool } from '../name-pool-data.js'\n\nexport const names: NamePool = ${poolLiteral(pool)}\n`)
    poolImports.push(`import { names as ${locale} } from './name-pools/${locale}.js'`)
    poolEntries.push(`  ${locale},`)
  }
  writeFileSync(join(directory, 'name-pool-data.ts'),
    `${nameSnapshotHeader}${poolImports.join('\n')}\n\n${poolType}\n\nexport const namePoolData: Record<string, NamePool> = {\n${poolEntries.join('\n')}\n}\n`)
}
