import Value from 'typebox/value'
import { buildApp } from './app.js'
import { isAgeProfileConsistent } from './age.js'
import { PeopleResponseSchema } from './contracts/people.js'
import { PersonSchema } from './contracts/person.js'
import { listCountries } from './geography/countries.js'
import { getCity } from './geography/cities.js'
import { listCoverage } from './geography/coverage.js'
import { profileGenerationStatus } from './geography/profile-availability.js'
import { portraitCoverageMatrix } from './portraits/catalog.js'
import { tagsMatchAppearance } from './portraits/appearance-tags.js'
import { portraitCatalog } from './portraits/manifest.js'

export async function auditBetaHttp() {
  const app = buildApp({ rateLimitMax: 1_000 })
  const available: string[] = []
  const pendingNameReview: string[] = []
  const unavailable: string[] = []
  const errors: string[] = []
  const asOf = '2026-09-24'
  try {
    for (const country of listCountries()) {
      const code = country.code
      const status = profileGenerationStatus(country)
      if (status === 'available') available.push(code)
      else if (status === 'pending-name-review') pendingNameReview.push(code)
      else unavailable.push(code)
      const baseUrl = `/people?country=${code}&count=2&age=27&gender=female&appearance=east-asian&seed=beta-audit&asOf=${asOf}`
      const url = `${baseUrl}&fields=${Object.keys(PersonSchema.properties).join(',')}`
      const response = await app.inject({ method: 'GET', url })
      if (status !== 'available') {
        if (response.statusCode !== 400 || response.json().error?.code !== 'UNSUPPORTED_VALUE') {
          errors.push(`${code}: unavailable code did not return UNSUPPORTED_VALUE`)
        }
        continue
      }
      if (response.statusCode !== 200) { errors.push(`${code}: HTTP ${response.statusCode}`); continue }
      const body = response.json()
      if (!Value.Check(PeopleResponseSchema, body)) { errors.push(`${code}: invalid response schema`); continue }
      if (body.meta.count !== 2 || body.meta.seed !== 'beta-audit' || body.meta.asOf !== asOf ||
        body.meta.catalogVersion !== portraitCatalog.version || body.results[0].id === body.results[1].id) {
        errors.push(`${code}: invalid response metadata or duplicate person`)
      }
      for (const person of body.results) {
        if (person.country !== code || !getCity(code, person.city) || person.address.country !== code ||
          person.address.city !== person.city || !person.address.formatted.includes(person.city) ||
          !person.firstName.trim() || !person.lastName.trim() || !person.fullName.trim() ||
          person.age !== 27 || person.gender !== 'female' || person.appearance !== 'east-asian' ||
          !isAgeProfileConsistent(person, asOf) || !person.email.endsWith('@example.test') ||
          (person.phone !== null && (!country.callingCode || !person.phone.startsWith(country.callingCode))) ||
          (person.picture !== null && !portraitCatalog.assets.some((asset) =>
            asset.reviewStatus === 'approved' && asset.ageGroup === person.ageGroup &&
            asset.gender === person.gender &&
            (person.appearance === 'mixed'
              ? (asset.compatibleAppearances ?? [asset.appearance]).includes('mixed')
              : asset.appearanceTags
                ? tagsMatchAppearance(asset.appearanceTags, person.appearance)
                : (asset.compatibleAppearances ?? [asset.appearance]).some((value) => value === person.appearance)) &&
            asset.apparentAgeRanges.some(([minimum, maximum]) => person.age >= minimum && person.age <= maximum) &&
            person.picture?.url === `${portraitCatalog.publicBaseUrl}/${asset.objectKey}`))) {
          errors.push(`${code}: incoherent generated person`)
        }
      }
      const replay = await app.inject({ method: 'GET', url })
      if (replay.statusCode !== 200 || replay.body !== response.body) errors.push(`${code}: seeded replay changed`)
      const projected = await app.inject({ method: 'GET', url: `${baseUrl}&fields=firstName,address.city,picture.url` })
      if (projected.statusCode !== 200 || projected.json().meta.count !== 2 ||
        projected.json().results.some((person: { firstName: string; address: { city: string }; picture: unknown }, index: number) =>
          person.firstName !== body.results[index].firstName || person.address.city !== body.results[index].city ||
          JSON.stringify(person.picture) !== JSON.stringify(body.results[index].picture))) {
        errors.push(`${code}: field projection changed generated values`)
      }
    }
  } finally { await app.close() }
  const coverage = listCoverage()
  const portraitRows = portraitCoverageMatrix(portraitCatalog)
  return {
    available: available.sort(), pendingNameReview: pendingNameReview.sort(), unavailable: unavailable.sort(),
    addressPartial: coverage.filter((row) => row.addresses.status === 'partial').map((row) => row.country).sort(),
    phonePending: coverage.filter((row) => row.phone.status === 'pending').map((row) => row.country).sort(),
    portrait: { approvedAssets: portraitCatalog.assets.filter((asset) => asset.reviewStatus === 'approved').length,
      readyCombinations: portraitRows.filter((row) => row.ready).length, totalCombinations: portraitRows.length },
    errors,
  }
}
