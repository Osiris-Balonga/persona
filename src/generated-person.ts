import type { AgeGroup } from './age.js'
import type { PublicPeopleResponse } from './contracts/public-people.js'
import type { fictionalAddress } from './geography/address-data.js'
import type { City } from './geography/cities.js'

// Internal generation data; public v2 responses are projected at the HTTP boundary.
export interface GeneratedPersonWithoutPortrait {
  id: string
  firstName: string
  lastName: string
  fullName: string
  gender: 'male' | 'female'
  age: number
  ageGroup: AgeGroup
  dateOfBirth: string
  country: string
  city: string
  locationCity: City
  address: ReturnType<typeof fictionalAddress>
  email: string
  phone: string | null
}

export interface GeneratedPerson extends GeneratedPersonWithoutPortrait {
  picture: { url: string } | null
}

export interface GeneratedPeopleResponse {
  results: GeneratedPerson[]
  meta: Omit<PublicPeopleResponse['meta'], 'schemaVersion'>
}
