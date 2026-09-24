import { cityData, cityEdition } from './city-data.js'

export { cityEdition }
export type City = (typeof cityData)[number]

const byCountry = new Map<string, City[]>()
for (const city of cityData) {
  const cities = byCountry.get(city.country) ?? []
  cities.push(city)
  byCountry.set(city.country, cities)
}

export function listCities(country: string): readonly City[] {
  return byCountry.get(country) ?? []
}

export function getCity(country: string, name: string): City | undefined {
  return listCities(country).find((city) => city.name.toLocaleLowerCase('en') === name.toLocaleLowerCase('en'))
}
