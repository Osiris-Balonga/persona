export interface UsageEvent {
  statusCode: number
  profileCount: number
  durationMs: number
}

export interface AnalyticsSink {
  record(event: UsageEvent): Promise<void>
}

export function createAnalyticsSink(endpoint: string, token: string, send: typeof fetch = fetch): AnalyticsSink {
  const url = new URL(endpoint)
  if (url.protocol !== 'https:' || url.pathname !== '/v1/events' || url.search || url.hash || !token) {
    throw new Error('Invalid analytics configuration')
  }
  return {
    async record(event) {
      const response = await send(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(1_500),
      })
      if (response.status !== 202) throw new Error('Analytics ingestion failed')
    },
  }
}
