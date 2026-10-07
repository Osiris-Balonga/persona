# Persona

Persona is an API for generating coherent fictional people for interface design, product development, and testing. A profile combines a name, age, location, contact details, and a synthetic portrait selected from a curated catalog.

The API is under development as a public beta with no API key. A small group of developers will help evaluate it first.

`GET /people` uses the [public v2 contract](docs/api.md). Requests can constrain nationality, residence country, continent, city, age group, gender and [portrait context](docs/portrait-contexts.md); `age` and `appearance` are not public filters. A result has structured `name`, `dob`, and `location` fields. Location coordinates identify the sampled city, not the synthetic street. `picture` has large, medium, and thumbnail URLs or is `null` when no reviewed portrait matches. A synthetic `login` is available only through `fields`.

The [product scope](docs/product.md) summarizes current behavior. Portraits follow the [review and import procedure](docs/portrait-review.md) and the [private R2 and Worker delivery path](docs/portrait-delivery.md). The approved catalog contains 1,764 standard portraits and 684 doctor portraits across all 19 production collections. Each has large, medium, and thumbnail WebP renditions; the large rendition is also the canonical source.
The [country availability table](docs/country-availability.md) lists profile, sampled-city postcode, and phone-source coverage for all 249 codes. The [beta audit](docs/beta-coverage.md) explains generation checks and current limits.
The [usage analytics guide](docs/analytics.md) defines private API request and profile-count statistics for the future project site.
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

The server handles `SIGTERM` and `SIGINT` by closing Fastify once, rejecting new requests and draining active requests and analytics writes. Analytics HTTP calls already have a 1.5-second timeout. Shutdown has a 10-second deadline; a failed close or exceeded deadline is logged and exits with status 1. Repeated signals do not restart draining. Run the compiled entry point directly with Node when configuring a process supervisor so signals reach it. Windows subprocess termination does not deliver these POSIX signals to JavaScript handlers; lifecycle tests run locally and actual-signal subprocess tests run on Linux CI. These checks do not establish a deployed rollback test.

## License

Persona's original code and documentation are licensed under [MIT](LICENSE). Third-party data and derived snapshots retain their source terms and attributions, documented in [geographic data](docs/geographic-data.md). Portrait images are stored outside this repository on R2 and are not covered by the repository's MIT license.
