# Persona

Persona is an API for generating coherent fictional people for interface design, product development, and testing. A profile combines a name, age, location, contact details, and a synthetic portrait selected from a curated catalog.

The API is under development. Its first release is planned as a public beta with no API key. A small group of developers will help evaluate it first.

## Principles

- Generate people, not general-purpose fake data.
- Respect explicit request parameters and make seeded results reproducible.
- Resolve cultural and visual context before selecting names and portraits; never infer a name from a face.
- Use clearly fictional contact details and addresses.

Development happens on `dev`. Production changes are promoted to `main` through a pull request from `dev`. See [CONTRIBUTING.md](CONTRIBUTING.md).
