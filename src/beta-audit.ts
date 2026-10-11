import Value from 'typebox/value'
import { buildApp } from './app.js'
import { ageOn, ageGroupForAge } from './age.js'
import { DefaultPublicPeopleResponseSchema } from './contracts/public-people.js'
import { listCountries } from './geography/countries.js'
import { getCity } from './geography/cities.js'
import { listCoverage } from './geography/coverage.js'
import { profileGenerationStatus } from './geography/profile-availability.js'
import { portraitCatalog } from './portraits/manifest.js'
import { collectionForCountry } from './portraits/collection-selection.js'
import { portraitCollectionOptions } from './review/collections.js'
import { portraitAgeRanges } from './review/age-ranges.js'

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
      const baseUrl = `/people?nationality=${code}&count=2&ageGroup=adult&gender=female&seed=beta-audit&asOf=${asOf}`
      const response = await app.inject({ method: 'GET', url: baseUrl })
      if (status !== 'available') {
        if (response.statusCode !== 400 || response.json().error?.code !== 'UNSUPPORTED_VALUE') {
          errors.push(`${code}: unavailable code did not return UNSUPPORTED_VALUE`)
        }
        continue
      }
      if (response.statusCode !== 200) { errors.push(`${code}: HTTP ${response.statusCode}`); continue }
      const body = response.json()
      if (!Value.Check(DefaultPublicPeopleResponseSchema, body)) { errors.push(`${code}: invalid response schema`); continue }
      if (body.meta.count !== 2 || body.meta.seed !== 'beta-audit' || body.meta.asOf !== asOf ||
        body.meta.catalogVersion !== portraitCatalog.version || body.results[0].id === body.results[1].id) {
        errors.push(`${code}: invalid response metadata or duplicate person`)
      }
      for (const person of body.results) {
        const city = getCity(code, person.location.city)
        if (person.nationality !== code || !city || person.location.country.code !== code ||
          person.location.coordinates.latitude !== city.latitude ||
          person.location.coordinates.longitude !== city.longitude ||
          person.location.coordinates.precision !== 'city' ||
          !person.location.formatted.includes(person.location.city) ||
          !person.name.first.trim() || !person.name.last.trim() || !person.name.full.trim() ||
          person.dob.ageGroup !== 'adult' || person.gender !== 'female' ||
          ageGroupForAge(person.dob.age) !== person.dob.ageGroup ||
          ageOn(person.dob.date, asOf) !== person.dob.age || !person.email.endsWith('@example.test') ||
          (person.phone !== null && (!country.callingCode || !person.phone.startsWith(country.callingCode))) ||
          (person.picture !== null && !portraitCatalog.assets.some((asset) =>
            asset.reviewStatus === 'approved' && asset.collection === collectionForCountry(code) &&
            asset.gender === person.gender &&
            asset.apparentAgeRanges.some(([minimum, maximum]) => person.dob.age >= minimum && person.dob.age <= maximum) &&
            person.picture?.large === `${portraitCatalog.publicBaseUrl}/portraits/${portraitCatalog.version}/large/${asset.id}.webp`))) {
          errors.push(`${code}: incoherent generated person`)
        }
      }
      const replay = await app.inject({ method: 'GET', url: baseUrl })
      if (replay.statusCode !== 200 || replay.body !== response.body) errors.push(`${code}: seeded replay changed`)
      const projected = await app.inject({ method: 'GET', url: `${baseUrl}&fields=name.first,location.city,picture.thumbnail` })
      if (projected.statusCode !== 200 || projected.json().meta.count !== 2 ||
        projected.json().results.some((person: { name: { first: string }; location: { city: string }; picture: { thumbnail: string } | null }, index: number) =>
          person.name.first !== body.results[index].name.first || person.location.city !== body.results[index].location.city ||
          person.picture?.thumbnail !== body.results[index].picture?.thumbnail)) {
        errors.push(`${code}: field projection changed generated values`)
      }
    }
  } finally { await app.close() }
  const coverage = listCoverage()
  const missingAgeBands = portraitCollectionOptions.flatMap((collection) =>
    (['female', 'male'] as const).flatMap((gender) =>
      Object.values(portraitAgeRanges).flat().filter(([min, max]) =>
        !portraitCatalog.assets.some((asset) => asset.reviewStatus === 'approved'
          && asset.collection === collection && asset.gender === gender
          && asset.apparentAgeRanges.some(([first, last]) => first === min && last === max)))
        .map(([min, max]) => ({ collection, gender, ageRange: [min, max] }))
    ))
  const totalAgeBands = portraitCollectionOptions.length * 2 * Object.values(portraitAgeRanges).flat().length
  return {
    available: available.sort(), pendingNameReview: pendingNameReview.sort(), unavailable: unavailable.sort(),
    addressPartial: coverage.filter((row) => row.addresses.status === 'partial').map((row) => row.country).sort(),
    phonePending: coverage.filter((row) => row.phone.status === 'pending').map((row) => row.country).sort(),
    portrait: { approvedAssets: portraitCatalog.assets.filter((asset) => asset.reviewStatus === 'approved').length,
      coveredAgeBands: totalAgeBands - missingAgeBands.length, totalAgeBands, missingAgeBands },
    errors,
  }
}
