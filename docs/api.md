# HTTP API contract

`GET /people` is the planned V1 endpoint. The query parser and response schemas are implemented; person generation and the route itself will be added after the remaining data and engine work. The [illustrative response](../examples/people-response-v1.json) contains one [V1 Person](../examples/person-v1.json). Its `example.test` image URL is a placeholder, not a published portrait.

## Query parameters

| Parameter | Rule |
| --- | --- |
| `count` | Integer from 1 to 100; defaults to 1 |
| `gender` | `male` or `female` |
| `age` | Integer from 0 to 120; the server derives `ageGroup` |
| `ageGroup` | `child`, `teen`, `adult`, or `senior`; must agree with `age` if both are supplied |
| `appearance` | Lowercase hyphenated label, at most 64 characters; supported labels come from the versioned taxonomy |
| `country` | Uppercase two-letter code; supported codes come from the versioned country and territory registry |
| `city` | Nonempty city name, at most 100 characters; requires `country` |
| `seed` | Optional opaque, nonblank string of at most 128 characters |
| `asOf` | Valid `YYYY-MM-DD` date; defaults to the current UTC date |
| `fields` | Optional, nonblank selection string of at most 512 characters; field names and nested selection are defined separately |

The encoded query string is limited to 2,048 characters. Unknown or repeated parameters are rejected. Explicit country, appearance, gender, and age constraints take precedence over probabilistic selection. The country registry and appearance taxonomy will validate membership after their datasets are added.

Example request (the response file is illustrative until the generator is implemented):

```http
GET /people?count=1&country=CG&city=Brazzaville&age=27&gender=female&appearance=central-african&seed=profile-demo&asOf=2026-09-24
```

## Responses and errors

A successful response has `results` and `meta`. `meta.count` is the number of returned people; `meta.asOf` is the resolved date used for age calculations. `meta.seed` is the supplied seed or `null` for an unseeded request. `meta.dataVersion` and `meta.catalogVersion` identify the inputs needed for replay. The versioned [response schema](../src/contracts/people.ts) bounds the result list to 100 people.

Invalid input returns HTTP 400 with an `error` object containing a stable `code`, a safe `message`, and, when relevant, `parameter`:

```json
{"error":{"code":"INVALID_QUERY","message":"age must be an integer","parameter":"age"}}
```

`INVALID_QUERY` covers malformed, unknown, repeated, or out-of-range parameters. `CONFLICTING_FILTERS` covers incompatible constraints such as `age=14&ageGroup=adult`, `city` without `country`, or a city assigned to another country. `UNSUPPORTED_VALUE` will cover country, city, or appearance values absent from their versioned registries once those datasets exist. Rate limiting will use HTTP 429 and `Retry-After`; its exact policy belongs to the public-beta security work.
