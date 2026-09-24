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
  if (country === 'US' && city === 'Washington') {
    return `+120255501${String(indexFromKey(key, 100)).padStart(2, '0')}`
  }
  if (country === 'GB') {
    return `+447700900${String(indexFromKey(key, 1_000)).padStart(3, '0')}`
  }
  return null
}
