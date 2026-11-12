export const maximumPeopleTotal = 10_000
export const maximumPageLimit = 100
export const maximumCursorLength = 4096

export interface PeoplePage {
  total: number
  limit: number
  offset: number
}
