# HTTP API contract

`GET /people` returns synthetic profiles using the [public v2 response schema](../src/contracts/public-people.ts). No API key is required.

## Query parameters

| Parameter | Rule |
| --- | --- |
| `count` | Integer 1–100; default 1 |
| `gender` | `male` or `female` |
| `ageGroup` | One or more distinct groups separated by commas: `child` (6–12), `teen` (13–17), `adult` (18–64), `senior` (65–100) |
| `nationality` | Uppercase ISO two-letter code with a reviewed name pool |
| `residenceCountry` | Uppercase ISO two-letter code with an available city; a reviewed name pool is not required for residence |
| `continent` | `africa`, `americas`, `asia`, `europe`, or `oceania`; restricts **nationality**, not residence |
| `city` | City in the residence country, at most 100 characters; requires `residenceCountry` or `nationality` |
| `emailDomain` | ASCII domain name with at least two labels; normalized to lowercase; default `example.test` |
| `seed` | Nonblank string of at most 128 characters |
| `asOf` | Valid `YYYY-MM-DD` date between `0102-01-01` and `9999-12-31`; default current UTC date |
| `fields` | Comma-separated public field paths, at most 512 characters |

When one country parameter is supplied, it supplies both nationality and residence. A residence without a reviewed name pool therefore needs a separate `nationality` or `continent` filter. With `continent` and an explicit `residenceCountry`, nationality is drawn from that continent while residence stays fixed. If no country is supplied, one country is drawn for both. A supplied `nationality` outside the requested `continent` returns 400. `age` and `appearance` are not query parameters. The encoded query is limited to 2,048 characters; unknown and repeated parameters return 400.

For example:

```http
GET /people?nationality=FR&residenceCountry=CG&city=Brazzaville&ageGroup=adult,senior&emailDomain=example.test&seed=demo&asOf=2026-09-28
```

## Response

Each item in `results` has `id`, `gender`, `name` (`first`, `last`, `full`), `nationality`, `dob` (`date`, `age`, `ageGroup`), `location`, `email`, `phone`, and `picture`. See a [complete v2 response](../examples/people-response-v2.json). `dob.age` is 6–100 at `meta.asOf`. `location` contains `street`, `city`, `state`, `country` (`code`, `name`), `postcode`, `coordinates` (`latitude`, `longitude`, `precision`), and `formatted`. `street`, `state`, and `postcode` can be `null`. Addresses are illustrative, not verified delivery destinations. Coordinates are the selected city's **exact GeoNames point**, with `precision: "city"`; they do not locate the street or a person. The [country availability table](country-availability.md) reports postcode coverage by sampled city, profile readiness, and phone-source status for each ISO code.

`picture` is `null` when no approved portrait matches. Otherwise it has HTTPS `large`, `medium`, and `thumbnail` WebP URLs. `login` (`username`, `password`) is omitted by default and is available through `fields`; these are synthetic demonstration credentials. `meta` contains `count`, `asOf`, `seed` (or `null`), `schemaVersion: "2"`, `dataVersion`, and `catalogVersion`.

Generated email addresses use an initial, family name, and short suffix on `emailDomain`. The default `.test` domain is reserved for examples ([RFC 2606](https://www.rfc-editor.org/rfc/rfc2606)); a caller-selected domain might be live. Phone numbers use reviewed fictional ranges where available. Other countries use format-valid fallback numbers that **may be assigned to real subscribers**; `phone` can also be `null`. Do not send email, SMS, or calls to generated contacts.

### Selecting fields

`fields` selects properties of each result; `results` and `meta` remain. Omission returns every public field except `login`. Supported top-level paths are `id`, `gender`, `name`, `nationality`, `dob`, `location`, `email`, `phone`, `picture`, and `login`. Supported nested paths are:

| Parent | Children |
| --- | --- |
| `name` | `first`, `last`, `full` |
| `dob` | `date`, `age`, `ageGroup` |
| `location` | `street`, `city`, `state`, `country`, `postcode`, `coordinates`, `formatted` |
| `location.country` | `code`, `name` |
| `location.coordinates` | `latitude`, `longitude`, `precision` |
| `picture` | `large`, `medium`, `thumbnail` |
| `login` | `username`, `password` |

For example, `fields=name.first,location.city,location.coordinates.latitude,picture.thumbnail` returns only those nested properties. A nullable parent remains `null` when one of its children is selected. Empty, unknown, repeated, or conflicting paths, such as `name,name.first`, return 400. Selection happens after generation and does not change retained values for the same seed and versions.

## Replay, caching, and errors

Seeded results repeat when `asOf`, filters, dataset and catalog versions, and generation algorithm version remain the same. Version `v5` derives separate keys per person and component. `count`, `fields`, and `emailDomain` do not change identity or portrait choices. `emailDomain` does change generated email addresses and the response `ETag`.

Successful requests with **explicit** `seed` and `asOf` return `Cache-Control: private, no-cache` and an `ETag`; matching `If-None-Match` returns 304 for GET and HEAD using weak comparison (both `"tag"` and `W/"tag"` match). Validator lists and `*` are supported. Invalid queries are rejected before cache revalidation. Other responses and errors use `Cache-Control: no-store`. An unseeded request draws fresh entropy and reports `meta.seed: null`.

Invalid input returns 400 with `error.code`, `message`, and `parameter`. `INVALID_QUERY` covers malformed, unknown, or repeated parameters; `CONFLICTING_FILTERS` covers mismatched continent and nationality or a city without a country; `UNSUPPORTED_VALUE` covers unavailable countries and cities outside the selected residence. See the [developer guide](developer-api.md#errors-and-limits) for service limits and 429 responses.
