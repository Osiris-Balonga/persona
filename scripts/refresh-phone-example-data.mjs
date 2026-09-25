import { writeFileSync } from 'node:fs'
import { iso31661 } from 'iso-3166'
import { getExampleNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'

const numbers = Object.fromEntries(iso31661.map(({ alpha2 }) => [alpha2, getExampleNumber(alpha2, examples)?.nationalNumber])
  .filter((entry) => entry[1] !== undefined).sort(([a], [b]) => a.localeCompare(b)))
const output = `// Generated from libphonenumber-js 1.13.14 mobile examples. Run npm run data:refresh:phones.\n` +
  `// These are formatting examples, not reserved or safe-to-call numbers.\n` +
  `export const mobilePhoneExamples: Readonly<Record<string, string>> = ${JSON.stringify(numbers, null, 2)}\n`
writeFileSync(new URL('../src/geography/phone-example-data.ts', import.meta.url), output)
