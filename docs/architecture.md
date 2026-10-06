# Beta architecture

Persona exposes a public, keyless HTTP API for generating coherent fictional people. The beta is intentionally small: a Node.js 24 and TypeScript service using Fastify and TypeBox, versioned read-only data files, and a curated portrait catalog. Fastify keeps the HTTP layer direct while TypeBox lets request and response schemas drive validation and serialization. We can add a larger application framework when the service grows enough to need it.

The v2 response separates nationality from residence in `location.country`. Its `location.coordinates` are the selected GeoNames city's latitude and longitude with `precision: "city"`; they do not locate the synthetic street. A selected email domain changes only the domain, and login credentials appear only when requested through `fields`. Telephone output prefers reviewed reserved ranges, then uses a strictly validated mobile-example fallback that may belong to a real subscriber.

## Hosting and delivery

- Use Render for the `dev` staging service. Promote to `main` for a later Hostinger production deployment after checking its Node.js runtime, health checks, and rollback path.
- Keep the API accessible over HTTPS without credentials. Bound request size, `count`, response size, and generation cost; apply rate limits using a trusted client IP. Define CORS, safe errors, and restrained logs before opening the beta.
- Keep datasets and the portrait manifest versioned so a result can record the data versions used. Reproducing a result requires the same request parameters, `seed`, `asOf`, and data and catalog versions. The HTTP cache policy must distinguish replayable responses from requests whose randomness or date is not fixed.
- Store approved WebP portraits in the private Cloudflare R2 bucket `persona-portraits`. Serve them through a read-only Cloudflare Worker bound to R2. The bucket has neither an enabled `r2.dev` endpoint nor a public custom domain. The Worker must check the approved manifest before returning an object; a public portrait URL is shareable, not confidential.

## Portrait catalog

A source object key is `portraits/v1/large/p_0001.webp`. The public `picture` object has `large`, `medium`, and `thumbnail` URLs under `portraits/v1/{size}/p_0001.webp` (512, 256, and 64 pixels). The validator still accepts older category-based keys for unshipped catalog fixtures. The versioned manifest lists approved IDs and rendition hashes with age ranges, gender, production collection, reviewed visual tags, optional Monk skin-tone annotation, review status, and usage rights. Collection records a production brief, not a person's ancestry; the public API no longer accepts an `appearance` filter. A Monk value describes perceived tone in an image and does not drive selection.

An import must verify WebP format, dimensions, metadata, duplicate hashes, and a strict size limit below 50,000 bytes. Only reviewed and approved IDs are selectable and readable. Selection maps the generated nationality to a broad collection using UN M49 geography, then matches gender and apparent age ranges within that collection. It uses a stable seeded choice and avoids repeated IDs in a multi-person response while unused compatible assets remain. Missing coverage returns `picture: null`.

The checked-in `v1` manifest contains 1,764 approved portraits and 5,292 large, medium, and thumbnail R2 objects. Locally reviewed masters and WebPs remain Git-ignored. `npm run data:audit:portraits` validates the catalog and reports 112/112 ready age, gender, and appearance-tag diagnostic combinations; `npm run data:audit:beta` measures actual collection-based selection and reports 836/836 covered collection, gender, and age bands. A withdrawn or rejected ID is never selected.

Approved versioned portrait URLs use `Cache-Control: public, max-age=300, must-revalidate`; missing and withdrawn assets use `no-store`. Withdrawal first removes approval, then purges all three rendition URLs from Cloudflare's global cache, and finally verifies that new requests are denied. Use normal URL cache keys and globally purgeable CDN paths; deleting an entry from a Worker's local Cache API is insufficient. Replacing an asset uses new keys or a catalog version. Previously fetched browser copies may remain fresh for up to five minutes. The [HTTP contract](api.md#replay-caching-and-errors) defines person-response caching. Additional synthetic portraits go through the same review and publication boundary.

## Development

Name generation, reviewed availability, and coverage provenance resolve the same typed registry in `src/geography/name-providers.ts`. Register a reviewed table there together with its primary and supplementary sources; retain the source tables and their usage-right declarations. The registry distinguishes paired components, intact full names, and patronymics, including gendered second components. It also retains weighted language/global fallback pools for countries awaiting review. A source-backed name pool does not by itself approve addresses or new geographic datasets.

Change behavior with a focused failing test first, then implement and refactor. Keep unit, integration, and end-to-end suites independently runnable, with realistic fixtures and tests aimed at distinct risks. Work enters `dev` through a pull request from a short-lived branch; production promotion is a pull request from `dev` to `main`.
