# HTTP API contract

`GET /people` is the V1 endpoint. The [illustrative response](../examples/people-response-v1.json) contains one [V1 Person](../examples/person-v1.json). Its `example.test` image URL is a placeholder, not a published portrait. The production portrait catalog is empty pending authorization and image review, so live responses currently return `picture: null`.

## Query parameters

| Parameter | Rule |
| --- | --- |
| `count` | Integer from 1 to 100; defaults to 1 |
| `gender` | `male` or `female` |
| `age` | Integer from 6 to 120; the server derives `ageGroup` |
| `ageGroup` | `child`, `teen`, `adult`, or `senior`; must agree with `age` if both are supplied |
| `appearance` | Lowercase hyphenated label, at most 64 characters; supported labels come from the versioned taxonomy |
| `country` | Uppercase two-letter code from the versioned registry; beta generation requires an available local name pool |
| `city` | Nonempty city name, at most 100 characters; requires `country` |
| `seed` | Optional opaque, nonblank string of at most 128 characters |
| `asOf` | Valid `YYYY-MM-DD` date; defaults to the current UTC date |
| `fields` | Optional comma-separated list of public person fields, at most 512 characters; omitted means standard fields (excluding `ageGroup` and `appearance`) |

The encoded query string is limited to 2,048 characters. Unknown or repeated parameters are rejected. Explicit country, appearance, gender, and age constraints take precedence over probabilistic selection. The [geographic registry and beta availability policy](geographic-data.md) validate assigned codes, reviewed local name pools, sampled city membership, and the versioned appearance vocabulary.

The generator resolves shared country, city, appearance, gender, and numeric age choices before names or contact details. Without an age filter it selects uniformly among integer ages 6–120; with `ageGroup` it selects uniformly within that group's numeric bounds. Within one response, repeated full names for the same country are retried with bounded independent draws; a small reviewed name pool can still cause repetitions. These are reproducible editorial rules, not demographic estimates. A birth date is then chosen so the numeric age is correct at `asOf`, including around leap days. The generated email uses the reserved `.test` domain ([RFC 2606](https://www.rfc-editor.org/rfc/rfc2606)). Phone output uses reviewed fictional ranges where available and remains `null` elsewhere. An approved compatible portrait is selected when the catalog contains one; otherwise `picture` is `null`.

### Selecting fields

`fields` applies to each person in `results`; it never removes `results` or `meta`. Without `fields`, the response omits `ageGroup` and `appearance`; request them explicitly with `fields` when needed. They remain internal generation and portrait-matching values. Names are case-sensitive and may be separated by commas, with optional whitespace around each name. A field may be selected by its top-level name, such as `address` or `picture`, or by one supported nested path: `address.line1`, `address.city`, `address.region`, `address.postalCode`, `address.country`, `address.formatted`, or `picture.url`. A nested path returns only that property inside its parent object. If `picture` is `null`, selecting `picture.url` returns `"picture": null`; nullable values are not silently omitted. `firstName` and `lastName` are always nonempty in the default response. `address.line1` is synthetic for every country currently available for profile generation; codes pending name review retain `null`. Generated building numbers are illustrative and may coincide with a real location; addresses are not verified as deliverable. `address.formatted` uses newline characters, shown as `\n` in JSON.

For a Burmese name, `fields=firstName,lastName,fullName` selects these values from a response:

```json
{"firstName":"Aye Aye","lastName":"Myint","fullName":"Aye Aye Myint"}
```

For example, `fields=firstName,city,picture.url` returns this shape for the illustrative person:

```json
{
  "results": [{
    "firstName": "Chikondi",
    "city": "Lilongwe",
    "picture": { "url": "https://images.example.test/portraits/v1/adult/female/black/southern-african/p_0042.webp" }
  }],
  "meta": {
    "count": 1,
    "asOf": "2026-09-24",
    "seed": "profile-demo",
    "dataVersion": "v1",
    "catalogVersion": "v1"
  }
}
```

An empty, unknown, internal, repeated, or conflicting selection returns HTTP 400 with `INVALID_QUERY` and `parameter: "fields"`. Selecting both a parent and its nested field, such as `picture,picture.url`, is conflicting. Selection runs after a complete person has been generated, so adding or removing fields cannot change the retained values for the same seed and versioned inputs. The [projected response schema](../src/contracts/people.ts) describes the partial result; the full response schema remains valid when `fields` is omitted.

Example request:

```http
GET /people?count=1&country=MW&city=Lilongwe&age=27&gender=female&appearance=southern-african&seed=profile-demo&asOf=2026-09-24
```

## Responses and errors

A successful response has `results` and `meta`. `meta.count` is the number of returned people; `meta.asOf` is the resolved date used for age calculations. `meta.seed` is the supplied seed or `null` for an unseeded request. `meta.dataVersion` and `meta.catalogVersion` identify the inputs needed for replay. The versioned [response schema](../src/contracts/people.ts) bounds the result list to 100 people.

### Replay and HTTP caching

A seeded request can be replayed when its `asOf`, filters, `seed`, `dataVersion`, `catalogVersion`, and generation algorithm version are unchanged. The V1 derivation hashes a fixed-order JSON array with SHA-256. It contains the algorithm version, seed, resolved `asOf`, both data versions, and all generation filters (`gender`, `age`, `ageGroup`, `appearance`, `country`, `city`); absent filters occupy `null` slots. A separate key for each zero-based person index and named component (for example, `identity` or `portrait`) is derived from that array. `count` and `fields` do not enter component keys, so requesting more people or fewer response fields cannot shift existing choices. The implementation is in [replay.ts](../src/replay.ts); algorithm changes require a version change. Dataset or catalog changes require their respective version to change and appear in `meta`.

Without `seed`, the server draws fresh request entropy once and reports `meta.seed: null`. Two such `GET` requests may return different people. HTTP `GET` remains safe and idempotent: repeating it does not request a server state change; idempotence does not require identical response bytes. This follows the [HTTP semantics specification](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2).

Successful responses with both an explicit `seed` and an explicit `asOf` use `Cache-Control: private, no-cache` and an `ETag` derived from all generation inputs, `count`, `fields`, both data versions, and the generation algorithm version. Matching conditional requests receive HTTP 304. A private cache may store them but must revalidate before reuse; shared caches must not store them. Responses without either explicit input and errors use `Cache-Control: no-store`; the response hook also applies this to future `429` responses. These directives follow [HTTP caching semantics](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2).

Approved portrait URLs include a catalog version and use `Cache-Control: public, max-age=300, must-revalidate`. A missing or withdrawn portrait response uses `no-store`. On withdrawal, the catalog entry must be disabled, the Worker must deny further reads, and the exact public URL must be purged from Cloudflare's global cache. A CDN cache key must remain the normal URL so that [purge by URL](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/) works; a local Worker Cache API deletion does not perform a global purge. Browser copies already fetched may remain until their five-minute freshness period ends. The Worker and withdrawal workflow are tracked separately from this contract.

Invalid input returns HTTP 400 with an `error` object containing a stable `code`, a safe `message`, and, when relevant, `parameter`:

```json
{"error":{"code":"INVALID_QUERY","message":"age must be an integer","parameter":"age"}}
```

`INVALID_QUERY` covers malformed, unknown, repeated, or out-of-range parameters. `CONFLICTING_FILTERS` covers incompatible constraints such as `age=14&ageGroup=adult` or `city` without `country`. `UNSUPPORTED_VALUE` covers an unassigned country, one without permanent residents, one pending a reviewed local name pool, a city outside its current sample, or an unknown appearance label. The [developer guide](developer-api.md#errors-and-limits) documents the 429 policy and request boundaries.
