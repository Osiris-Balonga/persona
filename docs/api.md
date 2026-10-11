# HTTP API contract

`GET /people` returns synthetic profiles using the [public v2 response schema](../src/contracts/public-people.ts). No API key is required.

`GET /coverage` returns the deployed country availability and approved portrait catalog summary. Each country includes its profile status, sampled-city and postcode-city counts, phone coverage, and raw M49 continent/subregion codes. Portrait totals include catalog manifest entries marked approved with all three delivery variants; the endpoint does not probe image-origin availability; Monk tone counts include only those assets with an annotation. The released context counts and selection weights are included. The response identifies the geographic data, portrait catalog, and selection-policy versions. It has no query parameters; an unknown parameter returns 400. Successful responses are public-cacheable for five minutes and include a content-derived `ETag`; send `If-None-Match` to revalidate. The shared 30-request-per-minute limit applies.

## Query parameters

| Parameter | Rule |
| --- | --- |
| `count` | Integer 1–100; default 1 |
| `gender` | `male` or `female` |
| `ageGroup` | One or more distinct groups separated by commas: `child` (6–12), `teen` (13–17), `adult` (18–64), `senior` (65–100) |
| `portraitContext` | `standard`, `doctor`, `construction`, `business`, `school-pupil`, `university-student`; intersects editorial eligibility with `ageGroup` |
| `portraitContexts` | Comma-separated distinct context allowlist, mutually exclusive with `portraitContext`; empty value disables pictures; ages use the union of selected context windows |
| `skinTone` | One or more distinct integers 1–10 on the Monk scale, comma-separated; filters annotated portraits only, independently of portrait type; omission accepts annotated and unannotated portraits |
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

`skinTone` describes the perceived tone of a portrait, not verified ancestry or a property of the generated identity. It preserves nationality, residence, name and age sampling. Selection still requires the production collection, gender, age and portrait type to match. Unannotated images never satisfy an explicit tone filter; unavailable combinations return `picture: null`. Use `skinTone=6,8` to match either annotation. The applied value is reported as `meta.skinTone`: a number for a single tone, or an ascending array for several tones. Reordering the list preserves portrait replay and the response ETag, without changing other component keys. `/coverage` reports actual annotation counts. Currently only standard portraits have tone annotations; contextual-only requests with this filter therefore have no matching pictures.

Each item in `results` has `id`, `gender`, `name` (`first`, `last`, `full`), `nationality`, `dob` (`date`, `age`, `ageGroup`), `location`, `email`, `phone`, and `picture`. See a [complete v2 response](../examples/people-response-v2.json). `dob.age` is 6–100 at `meta.asOf`. `location` contains `street`, `city`, `state`, `country` (`code`, `name`), `postcode`, `coordinates` (`latitude`, `longitude`, `precision`), and `formatted`. `street`, `state`, and `postcode` can be `null`. Addresses are illustrative, not verified delivery destinations. Coordinates are the selected city's **exact GeoNames point**, with `precision: "city"`; they do not locate the street or a person. The [country availability table](country-availability.md) reports postcode coverage by sampled city, profile readiness, and phone-source status for each ISO code.

`picture` is `null` when no approved portrait matches the requested context, production collection, gender and reviewed age. Otherwise it has HTTPS `large`, `medium`, and `thumbnail` WebP URLs. `login` (`username`, `password`) is omitted by default and is available through `fields`; these are synthetic demonstration credentials. `meta` contains `count`, `asOf`, `seed` (or `null`), `schemaVersion: "2"`, `dataVersion`, and `catalogVersion`. Current responses emit `portraitContexts` for the mixed default or plural selection, `portraitContext` for a singular selection, and `portraitSelectionVersion` (optional in the v2 schemas for legacy envelopes). See [context eligibility, null coverage and replay](portrait-contexts.md).

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

Clients should map `error.code` and `error.parameter` to localized guidance; the English `message` is developer-facing and is not a stable translation key. Validation errors describe the correction without repeating arbitrary field values. Parameter names longer than 64 characters are reported as `query`. Internal failures retain generic messages without stack traces or infrastructure details, following [OWASP error-handling guidance](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#error-handling) and the disclosure considerations in [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html#section-5). The existing v2 error envelope is retained.
