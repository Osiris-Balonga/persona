# Developer quickstart

Persona exposes `GET /people` without an API key. For local development, run `npm ci && npm run dev`, then request a seeded profile:

```sh
curl -i 'http://localhost:3000/people?nationality=FR&residenceCountry=CG&city=Brazzaville&ageGroup=adult,senior&count=1&seed=demo&asOf=2026-09-28'
```

In JavaScript:

```js
const response = await fetch('http://localhost:3000/people?nationality=FR&seed=demo&asOf=2026-09-28')
if (!response.ok) throw new Error(`Persona returned ${response.status}`)
const { results, meta } = await response.json()
console.log(results[0].name.full, results[0].location.city, meta.schemaVersion)
```

The response has `results` and `meta` (`schemaVersion: "2"`). Each person includes nested `name`, `dob`, `location`, and `picture`; a [complete response example](../examples/people-response-v2.json) shows the shape. `login` is opt-in with `fields=login` or a nested path such as `fields=login.username`. Other examples are `fields=name.first,location.country.code,location.coordinates.latitude,picture.thumbnail`. `picture` can be `null`. The [full API contract](api.md) lists every field and parameter, and the [country table](country-availability.md) shows current data availability.

## Inputs and replay

`count` accepts 1–100 and defaults to 1. `gender` is `male` or `female`. `ageGroup` accepts one or more distinct values from `child`, `teen`, `adult`, `senior`, separated by commas. Ages in responses are 6–100. `nationality` chooses a reviewed name pool; `residenceCountry` chooses the location and phone numbering country. `continent` (`africa`, `americas`, `asia`, `europe`, `oceania`) constrains nationality. `city` belongs to residence. If one country is supplied without `continent`, it is used for both nationality and residence; if neither is supplied, one is drawn for both. `age` and `appearance` are not accepted query parameters.

`emailDomain` selects an ASCII domain and defaults to `example.test`. `seed` accepts up to 128 nonblank characters. `asOf` is a valid `YYYY-MM-DD` date between `0102-01-01` and `9999-12-31`; omitted means the current UTC date. This range keeps birth dates representable for every supported age. Supply both `seed` and `asOf` to replay a response against the same data, catalog, and algorithm versions. Those requests receive a private `ETag`; send `If-None-Match` to receive 304 when unchanged, including weak validators such as `W/"tag"`. `count` and `fields` do not shift the generated people. Changing `emailDomain` changes email addresses and the `ETag`, while keeping identity and portrait choices.

Coordinates in `location` are the exact GeoNames point for the selected city, marked `precision: "city"`. They are not street or person coordinates. Addresses are illustrative. Phones use reviewed fictional ranges where available; format-valid fallback numbers elsewhere **may belong to real subscribers**. Do not contact generated email addresses or phone numbers, particularly when using a live `emailDomain`.

## Errors and limits

Invalid, conflicting, and unsupported filters return 400 with `error.code`, `message`, and `parameter`. The encoded query is limited to 2,048 characters. `GET` and `HEAD` bodies are rejected; request bodies are capped at 1 KiB. A response is capped at 256 KiB and returns 503 with `RESPONSE_TOO_LARGE` if exceeded. Unknown routes return 404; unsupported methods on documented routes return 405. Browser access allows `GET` and `HEAD` from any origin without credentials.

Body parsing happens before method rejection: malformed or empty JSON returns 400 with `BAD_REQUEST`, while a well-formed body on an unsupported method returns 405. Unsupported media types detected by the parser return 415 with `UNSUPPORTED_MEDIA_TYPE`; oversized bodies return 413 with `REQUEST_TOO_LARGE`. Client errors use safe messages and `Cache-Control: no-store`. Unexpected server failures return 500 with `INTERNAL_ERROR` and are logged internally.

The default limit is **30 requests per minute per client IP per server instance**, including conditional requests. Exceeding it returns 429 with `error.code: RATE_LIMITED`, `Cache-Control: no-store`, and `Retry-After` in seconds. Wait at least that long before retrying. The quota is held in memory per process, so multi-instance deployments need a shared limit store.
