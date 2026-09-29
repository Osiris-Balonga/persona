# API usage analytics

Persona counts `GET /people` responses in a private Cloudflare Worker backed by a SQLite Durable Object. Render sends one small event after each response. The Worker accepts only a status code, the number of profiles returned, and elapsed milliseconds. Its credential determines whether the event belongs to staging or production. The same store exposes aggregate statistics to a server-side client holding a separate read credential.

## Definitions

Each completed `GET /people` is one request, including validation errors, rate limits, and cache revalidations. `successes` counts status codes below 400; `clientErrors` counts 4xx, and `rateLimited` is the 429 subset; `serverErrors` counts 5xx. `profiles` counts generated results delivered by a 200 response. A 304 or error contributes zero profiles. `averageLatencyMs` is the arithmetic mean. `latencyP95UpperBoundMs` is the upper edge of the bucket containing the approximate 95th percentile (100, 250, 500, 1000, 2500, or 5000 ms); it is `null` above 5000 ms.

Hourly counters are durable across application restarts and Render instances. Queries can group them by UTC hour or day. The data consists only of aggregates and is retained until an operator removes the Durable Object; a single query is limited to 366 days. A full year is at most 8,784 hourly rows per environment. The API never sends IP addresses, raw URLs or query strings, seeds, profiles, or email addresses to this Worker. `/health`, `HEAD`, unknown routes, and portrait downloads are outside the usage totals. Anonymous requests can include scripts or bots; request counts are **not** a count of distinct developers. A failed ingestion does not fail the public API, so an outage of the analytics Worker can create a gap in the series; the API logs a generic warning.

Cloudflare's [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) applies: each counted request causes one Worker invocation, one Durable Object request, and one aggregated row write. The current free tier includes 100,000 Durable Object requests per day and SQLite storage allowances; review account usage before higher traffic. No individual request records are stored.

## Backups and recovery

At 02:17 UTC daily, the analytics Worker exports each environment's hourly rows to the private `persona-analytics-backups` R2 bucket. Each versioned JSON snapshot includes the environment, creation time, row count and SHA-256 checksum. The Worker reads the upload back, validates it, restores it into a separate verification Durable Object, and compares every row. A failed backup does not erase live counters. Backups have no automatic expiry. The bucket is separate from the portrait bucket and has no public R2 URL.

An operator can create a backup immediately with `POST /v1/backups/run`, authenticated with the separate `ANALYTICS_BACKUP_TOKEN`. The response gives each private R2 key, row count, checksum and verification time. To test an older snapshot, send `POST /v1/backups/verify` with the same bearer token and a JSON body such as `{ "environment": "production", "key": "analytics/v1/production/...json" }`. This validates the stored file and restores it into `recovered:production`, without writing to the active `production` object. Only aggregate rows are exported; no individual request, IP address or query is included.

For an incident, first stop the faulty deployment or ingestion. If live data is still readable, take a fresh backup. List the private R2 snapshots and verify the chosen one through `/v1/backups/verify`; compare its time and totals with the last known live data. Switching to an older snapshot can lose usage since that snapshot, so record this gap. A production cutover requires a reviewed change of `productionStore` in `worker/analytics-worker.ts` from `primary` to `recovered`, followed by deployment. The old primary object is preserved. Reverting the constant switches back. Coordinate cutover while traffic is paused or accept the documented gap. The daily verification object is separate from the recovery candidate.

CI rejects accidental changes to the Worker name, Durable Object classes, bindings or storage, R2 binding, and daily trigger. A deliberate storage migration requires a separate reviewed procedure. Cloudflare's SQLite Durable Objects also support [point-in-time recovery for the previous 30 days](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/); R2 holds independent longer-lived copies. Ordinary PRs and redeployments with unchanged identities do not erase the data.

## Deployment

Deploy the analytics Worker with `npx wrangler deploy --config wrangler.analytics.jsonc`. Configure four distinct Worker secrets: `ANALYTICS_STAGING_TOKEN`, `ANALYTICS_PRODUCTION_TOKEN`, `ANALYTICS_READ_TOKEN`, and `ANALYTICS_BACKUP_TOKEN`. On Render's `persona-dev` service, set `ANALYTICS_INGEST_URL` to the Worker's HTTPS `/v1/events` URL and `ANALYTICS_INGEST_TOKEN` to the staging token. The API requires both values together; a Render process refuses to start without them. The future production service must use the production token. Keep all four tokens out of Git and browser code.

The separate Next.js site can fetch `GET /v1/stats` **from its server only**, using `Authorization: Bearer <read token>`. The Worker does not enable browser CORS. Required query parameters are `environment=staging|production`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, and `granularity=hour|day`. `from` is inclusive, `to` is exclusive, and the period must be at most 366 days. A response has this shape:

```json
{
  "from": "2026-09-28",
  "to": "2026-09-29",
  "granularity": "day",
  "points": [{
    "period": "2026-09-28",
    "requests": 12,
    "successes": 10,
    "clientErrors": 1,
    "rateLimited": 1,
    "serverErrors": 1,
    "profiles": 31,
    "averageLatencyMs": 87,
    "latencyP95UpperBoundMs": 250
  }]
}
```

No public analytics endpoint is added to the Persona API. The Next.js server should store the read token as a server-only secret, fetch aggregates, and expose only the statistics chosen for its UI. The API's request metrics use bounded status and environment dimensions, consistent with [OpenTelemetry's HTTP guidance](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/).
