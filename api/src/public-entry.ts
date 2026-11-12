const aliases: Readonly<Record<string, string>> = {
  '/api': '/people',
  '/api/': '/people',
  '/api/people': '/people',
  '/api/health': '/health',
  '/api/coverage': '/coverage',
}

// Reuse the existing handlers, including analytics, errors and validators.
export function publicEntryUrl(url: string): string {
  const boundary = url.indexOf('?')
  const path = boundary < 0 ? url : url.slice(0, boundary)
  const target = aliases[path]
  return target === undefined ? url : target + (boundary < 0 ? '' : url.slice(boundary))
}
