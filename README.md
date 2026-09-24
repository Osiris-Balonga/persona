# Persona

Persona is an API for generating coherent fictional people for interface design, product development, and testing. A profile combines a name, age, location, contact details, and a synthetic portrait selected from a curated catalog.

The API is under development. Its first release is planned as a public beta with no API key. A small group of developers will help evaluate it first.

See the [V1 product definition](docs/product.md) for the approved scope.
The planned HTTP request and response formats are in the [API contract](docs/api.md).

## Principles

- Generate people, not general-purpose fake data.
- Respect explicit request parameters and make seeded results reproducible.
- Resolve cultural and visual context before selecting names and portraits; never infer a name from a face.
- Use clearly fictional contact details and addresses.

Development happens on `dev`. Production changes are promoted to `main` through a pull request from `dev`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Local development

The API foundation currently exposes `GET /health`. Person generation is under development.

```sh
npm ci
npm run dev
```

The server reads `PORT` from the environment and defaults to `3000`. Run `npm run build` and `npm start` for the compiled application.
