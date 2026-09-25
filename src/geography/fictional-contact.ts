import { getCity } from './cities.js'

const nanpAreas: Record<string, Readonly<Record<string, string>>> = {
  US: {
    'New York City': '212', 'Los Angeles': '213', Brooklyn: '718', Chicago: '312',
    Queens: '718', Houston: '713', Phoenix: '602', Philadelphia: '215',
    'San Antonio': '210', Manhattan: '212', 'San Diego': '619', 'The Bronx': '718',
    Washington: '202',
  },
  CA: {
    Toronto: '416', Montréal: '514', Calgary: '403', Ottawa: '613', Edmonton: '780',
    Winnipeg: '204', Mississauga: '905', Vancouver: '604', Brampton: '905',
    Hamilton: '905', Surrey: '604', Québec: '418',
  },
}

function indexFromKey(key: string, range: number): number {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new RangeError('Invalid generation key')
  return Number.parseInt(key.slice(0, 12), 16) % range
}

function emailPart(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'person'
}

export function fictionalEmail(firstName: string, lastName: string, key: string): string {
  indexFromKey(key, 1)
  const name = `${emailPart(firstName)}.${emailPart(lastName)}`
  return `${name}.${key.slice(0, 12)}@example.test`
}

export function fictionalPhone(country: string, city: string, key: string): string | null {
  const index = indexFromKey(key, 10_000)
  if (country === 'US' || country === 'CA') {
    const area = nanpAreas[country][city]
    return area && getCity(country, city) ? `+1${area}55501${String(index % 100).padStart(2, '0')}` : null
  }
  if (country === 'GB') {
    return `+447700900${String(index % 1_000).padStart(3, '0')}`
  }
  if (country === 'AU') {
    const region = getCity(country, city)?.region
    const area = region === 'New South Wales' || region === 'Australian Capital Territory' ? '2'
      : region === 'Victoria' || region === 'Tasmania' ? '3'
        : region === 'Queensland' ? '7'
          : region === 'Western Australia' || region === 'South Australia' || region === 'Northern Territory' ? '8' : null
    return area ? `+61${area}5550${String(index).padStart(4, '0')}` : null
  }
  return null
}
