# Persona V1

Persona generates coherent fictional people for interface design, development, and testing. The first release is a public HTTP API with no API key. A small group of developers will evaluate the beta first, while access remains public.

## A person

A V1 person has an identity (`id`, `firstName`, `lastName`, `fullName`), a gender, a numeric `age`, a derived `ageGroup`, and a `dateOfBirth`. It has an appearance category and a location with a country, city, and structured address. It may include a fictional email and phone number and a URL for a reviewed synthetic portrait. The public schema will define exact formats, required fields, and nullability.

The age group is calculated from the numeric age: `child` is 6–12, `teen` is 13–17, `adult` is 18–64, and `senior` is 65 or older. A request may use `age=14` for an exact age or `ageGroup=teen` when the exact age is left to Persona. `age=teen` is invalid, and an explicit age and age group that disagree are rejected.

`asOf` is a calendar date in `YYYY-MM-DD` format. When omitted, the API uses the current UTC date and returns that resolved date so the request can be replayed. Age changes on the calendar birthday at `asOf`; for a February 29 birth, the anniversary falls on March 1 in non-leap years. A birth date after `asOf` is invalid. The seed and resolved `asOf`, together with request parameters and data versions, determine a reproducible generated result.

The full public object has a [V1 example](../examples/person-v1.json) and a versioned [TypeBox schema](../src/contracts/person.ts). Its fields have these shapes:

| Field | V1 shape |
| --- | --- |
| `id` | Nonempty identifier prefixed with `per_` |
| `firstName`, `lastName`, `fullName` | Three nonempty strings; `fullName` combines the first and last display components |
| `gender` | `male` or `female` |
| `age`, `ageGroup`, `dateOfBirth` | Integer from 6 to 120; `child`, `teen`, `adult`, or `senior`; RFC 3339 full date (`YYYY-MM-DD`) |
| `appearance`, `country`, `city` | Nonempty appearance label; uppercase two-letter code from the registry; nonempty city |
| `address` | nullable `line1`, `city`, nullable `region`, nullable `postalCode`, `country`, and country-ordered `formatted` |
| `email`, `phone` | Email at `example.test`; phone from a reviewed fictional range or `null` when no safe range is available |
| `picture` | Object with an HTTPS `url`, or `null` when no compatible approved portrait is available |

The default response omits the derived `ageGroup` and internal portrait-matching `appearance`; either can be requested explicitly with `fields`. The [field selection contract](api.md#selecting-fields) may omit public fields, but internal fields are never part of this schema. Format checks do not replace the generation rules that will keep age and birth date, country and city, or address components consistent.

`firstName` and `lastName` are always populated so developers can use them in ordinary two-field forms. Some naming traditions do not use an inherited family surname; in those cases, `lastName` is a second display component of a plausible complete name, not a claim about ancestry. `firstName` can contain more than one word.

Cities belong to their selected countries. Addresses use the available country format and a city-linked postal code when verified; otherwise `postalCode` is `null`. They are fictional and not meant for delivery. Email addresses use a domain reserved for examples. Phone generation follows each country's format and uses non-assignable test ranges where available; limitations must be stated where no safe range is known. Persona does not present these values as real contact details.

The versioned registry recognizes every assigned country and territory code. Beta profile generation is enabled for resident codes only after a local name-pool review; other codes remain visible as pending or unavailable in the coverage matrix. A country does not imply a single appearance. A requested available country and appearance are both respected, and names are selected independently of the portrait.

## Requests and reproducibility

`GET /people` will accept a bounded `count` and filters for gender, numeric age, age group, appearance, country, and city. A `fields` query parameter will select public response fields, including nested fields such as `picture.url`. Unknown or internal fields will be rejected. Selecting fewer fields must not change the retained values for the same generated person.

`seed` and `asOf`, together with the request parameters and the versions of the datasets and portrait catalog, make a response reproducible. Without a seed, responses may differ. The [HTTP contract](api.md) defines request limits, errors, replay, and cache behavior; rate limits will be fixed before the public beta opens.

Portraits come from a pre-generated, reviewed catalog; requests do not generate images. The catalog uses approved metadata for age group, gender, and appearance. An absent compatible portrait has an explicit outcome. Producing the actual images remains gated by separate authorization from the project owner.

## Scope

V1 focuses on fictional people. It does not generate employers, income, identity documents, health details, biographies, or unrelated fake-data categories. The JavaScript SDK is a later milestone; the HTTP API is the V1 interface.
