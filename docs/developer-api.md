# Developer quickstart

Persona's public beta has one generation endpoint: `GET /people`. It needs no API key or credentials. Start the local server with `npm ci && npm run dev`, then run:

```sh
curl -i 'http://localhost:3000/people?country=MW&city=Lilongwe&age=27&count=2&seed=demo&asOf=2026-09-24&fields=firstName,lastName,age,ageGroup,address.city,picture.url'
```

Production requests must use HTTPS. There is no live production URL yet. The response contains `results` and `meta`; `fields` selects person properties while retaining `meta`. `firstName` and `lastName` are always populated in a full response. `picture` is currently `null` because no portrait has been approved. The default response omits `ageGroup` and `appearance`; select them with `fields` if needed. `address.line1` is `null` while street data is unreviewed.

## Inputs

`count` defaults to 1 and accepts 1–100. `age` is an integer from 6–120; `ageGroup` is a separate derived value (`child`, `teen`, `adult`, `senior`) and can also be used as a filter. The two filters must agree. `country` is an uppercase two-letter code with a reviewed local name pool; `city` requires a country and must match an available city. `gender` accepts `male` or `female`; `appearance` accepts a supported lowercase category. `seed` accepts 1–128 characters and `asOf` accepts a valid `YYYY-MM-DD` date. See the [full parameter table](api.md#query-parameters) and [field paths](api.md#selecting-fields).

Supply both `seed` and `asOf` to replay the same result against the same dataset and algorithm versions. Such responses have a private `ETag`; send `If-None-Match` to get `304` when unchanged. Responses without either explicit input, and errors, use `Cache-Control: no-store`.

## Errors and limits

Invalid, conflicting, and unsupported filters return `400` with a safe `error.code`, `message`, and optional `parameter`. The encoded query is capped at 2,048 characters; request bodies are capped at 1 KiB, and `GET`/`HEAD` bodies are rejected. The maximum response contains 100 people and is capped at 256 KiB; an unexpectedly larger response returns `503` with `RESPONSE_TOO_LARGE`. Unknown routes return `404`; unsupported methods on documented routes return `405`. Browser access permits `GET` and `HEAD` from any origin, without credentials. A CORS preflight uses `OPTIONS`.

The beta permits **30 requests per minute per client IP per server instance**, including conditional requests. An exceeded quota returns `429`, `error.code: RATE_LIMITED`, `Cache-Control: no-store`, and `Retry-After` in seconds. `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` describe the current window. Wait at least `Retry-After` before retrying. People behind one public IP share a quota. The in-memory quota is per process; deployment must use one API instance or a shared limit store before scaling out. The `count` cap and quota bound generation to at most 3,000 people per IP per minute on an instance.

Generated profiles are synthetic test data. Emails use `.test`, phone numbers are populated only for verified fictional ranges, addresses are plausible samples rather than delivery destinations, and ages and country selection are editorial rather than demographic estimates. Some country codes remain unavailable pending review of local name pools. Do not treat a profile as a real identity. See [geographic coverage](geographic-data.md).
