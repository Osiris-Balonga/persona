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
| `fields` | Optional comma-separated list of public person fields, at most 512 characters; omitted means every public field |

The encoded query string is limited to 2,048 characters. Unknown or repeated parameters are rejected. Explicit country, appearance, gender, and age constraints take precedence over probabilistic selection. The country registry and appearance taxonomy will validate membership after their datasets are added.

### Selecting fields

`fields` applies to each person in `results`; it never removes `results` or `meta`. Without `fields`, every public field in the [Person schema](../src/contracts/person.ts) is returned. Names are case-sensitive and may be separated by commas, with optional whitespace around each name. A field may be selected by its top-level name, such as `address` or `picture`, or by one supported nested path: `address.line1`, `address.city`, `address.postalCode`, `address.country`, or `picture.url`. A nested path returns only that property inside its parent object. If `picture` is `null`, selecting `picture.url` returns `"picture": null`; nullable values are not silently omitted.

For example, `fields=firstName,city,picture.url` returns this shape for the illustrative person:

```json
{
  "results": [{
    "firstName": "Grâce",
    "city": "Brazzaville",
    "picture": { "url": "https://images.example.test/portraits/v1/adult/female/black/central-african/p_0042.webp" }
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
