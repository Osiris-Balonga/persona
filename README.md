# Persona

Persona is an API for generating coherent fictional people for interface design, product development, and testing. A profile combines a name, age, location, contact details, and a synthetic portrait selected from a curated catalog.

The API is under development as a public beta with no API key. A small group of developers will help evaluate it first.

`GET /people` uses the [public v2 contract](docs/api.md). Requests can constrain nationality, residence country, continent, city, age group, and gender; `age` and `appearance` are not public filters. A result has structured `name`, `dob`, and `location` fields. Location coordinates identify the sampled city, not the synthetic street. `picture` has large, medium, and thumbnail URLs or is `null` when no reviewed portrait matches. A synthetic `login` is available only through `fields`.

The [product scope](docs/product.md) summarizes current behavior. Portraits follow a [human review and import procedure](docs/portrait-review.md) and the [private R2 and Worker delivery path](docs/portrait-delivery.md). R2 stores one large, medium, and thumbnail WebP for each of the 1,764 approved portraits; the large rendition is also the canonical source.
The [country availability table](docs/country-availability.md) lists profile, sampled-city postcode, and phone-source coverage for all 249 codes. The [beta audit](docs/beta-coverage.md) explains generation checks and current limits.
Start with the [developer API guide](docs/developer-api.md); the full request and response rules are in the [API contract](docs/api.md).
See a [complete v2 response](examples/people-response-v2.json) for the current JSON structure.

## Principles

- Generate people, not general-purpose fake data.
- Respect explicit request parameters and make seeded results reproducible.
- Resolve cultural and visual context before selecting names and portraits; never infer a name from a face.
- Generate synthetic contact details and illustrative addresses; number-format fallbacks may belong to real subscribers.

Development happens on `dev`. Production changes are promoted to `main` through a pull request from `dev`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Local development

The local server exposes `GET /health` and `GET /people`.

```sh
npm ci
npm run dev
```

The server reads `PORT` from the environment and defaults to `3000`. Run `npm run build` and `npm start` for the compiled application. In production, set `TRUSTED_PROXIES` to the exact IP addresses or CIDR ranges of the TLS-terminating reverse proxy. The server refuses to start without that setting and rejects requests that did not arrive over HTTPS through a trusted proxy. On a Render web service, Render enforces HTTPS at its edge and supplies `CF-Connecting-IP` for per-client rate limiting; no `TRUSTED_PROXIES` value is needed there.
