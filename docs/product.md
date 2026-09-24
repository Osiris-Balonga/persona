# Persona V1

Persona generates coherent fictional people for interface design, development, and testing. The first release is a public HTTP API with no API key. A small group of developers will evaluate the beta first, while access remains public.

## A person

A V1 person has an identity (`id`, `firstName`, `lastName`, `fullName`), a gender, a numeric `age`, a derived `ageGroup`, and a `dateOfBirth`. It has an appearance category and a location with a country, city, and structured address. It may include a fictional email and phone number and a URL for a reviewed synthetic portrait. The public schema will define exact formats, required fields, and nullability.

The age group is calculated from the numeric age: `child` is 0–12, `teen` is 13–17, `adult` is 18–64, and `senior` is 65 or older. A request may use `age=14` for an exact age or `ageGroup=teen` when the exact age is left to Persona. `age=teen` is invalid, and an explicit age and age group that disagree are rejected.

`asOf` is a calendar date in `YYYY-MM-DD` format. When omitted, the API uses the current UTC date and returns that resolved date so the request can be replayed. Age changes on the calendar birthday at `asOf`; for a February 29 birth, the anniversary falls on March 1 in non-leap years. A birth date after `asOf` is invalid. The seed and resolved `asOf`, together with request parameters and data versions, determine a reproducible generated result.

The full public object has a [V1 example](../examples/person-v1.json) and a versioned [TypeBox schema](../src/contracts/person.ts). Its fields have these shapes:

| Field | V1 shape |
| --- | --- |
| `id` | Nonempty identifier prefixed with `per_` |
| `firstName`, `lastName`, `fullName` | Nonempty strings |
| `gender` | `male` or `female` |
| `age`, `ageGroup`, `dateOfBirth` | Nonnegative integer; `child`, `teen`, `adult`, or `senior`; RFC 3339 full date (`YYYY-MM-DD`) |
| `appearance`, `country`, `city` | Nonempty appearance label; uppercase two-letter code from the registry; nonempty city |
| `address` | `line1`, `city`, `country`, and `postalCode` (string or `null`) |
| `email`, `phone` | Email at `example.test`; phone string or `null` when no safe fictional number is available |
| `picture` | Object with an HTTPS `url`, or `null` when no compatible approved portrait is available |

All fields appear in the full representation. A future `fields` projection may omit public fields, but internal fields are never part of this schema. Format checks do not replace the generation rules that will keep age and birth date, country and city, or address components consistent.

Cities belong to their selected countries. Addresses use a country-appropriate format and a coherent city and postal code where applicable, but are fictional. Email addresses use a domain reserved for examples. Phone generation follows each country's format and uses non-assignable test ranges where available; limitations must be stated where no safe range is known. Persona does not present these values as real contact details.

The supported geography is every country and territory in a versioned code registry. Data coverage is tracked per code, with explicit regional fallbacks where local sources are insufficient. A country does not imply a single appearance. A requested country and appearance are both respected, and names are selected from a cultural pool independently of the portrait.

## Requests and reproducibility

`GET /people` will accept a bounded `count` and filters for gender, numeric age, age group, appearance, country, and city. A `fields` query parameter will select public response fields, including nested fields such as `picture.url`. Unknown or internal fields will be rejected. Selecting fewer fields must not change the retained values for the same generated person.

`seed` and `asOf`, together with the request parameters and the versions of the datasets and portrait catalog, make a response reproducible. Without a seed, responses may differ. The API will define request limits, errors, cache behavior, and rate limits before the public beta opens.

Portraits come from a pre-generated, reviewed catalog; requests do not generate images. The catalog uses approved metadata for age group, gender, and appearance. An absent compatible portrait has an explicit outcome. Producing the actual images remains gated by separate authorization from the project owner.

## Scope

V1 focuses on fictional people. It does not generate employers, income, identity documents, health details, biographies, or unrelated fake-data categories. The JavaScript SDK is a later milestone; the HTTP API is the V1 interface.
