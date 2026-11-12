# Persona v1

Persona generates coherent fictional people for interfaces, prototypes and tests. This repository contains the Fastify API, Next.js website, bilingual documentation, playground and CLI.

## Applications

| Directory | Purpose | Deployment |
| --- | --- | --- |
| [`api/`](api/README.md) | API, versioned datasets, portrait Workers and CLI | Hostinger production, Render staging |
| [`web/`](web/README.md) | Website, EN/FR documentation and playground | Vercel |
| [`api/packages/cli/`](api/packages/cli/README.md) | HTTP fixture exports and seed scaffolding | npm package |

The API and website retain independent npm manifests and lockfiles. Use Node.js 24 and npm. From this directory:

```sh
npm run setup
npm run dev:api
# In a second terminal:
npm run dev:web
```

The API listens on port 3000 and the website on port 3001. Copy `api/.env.example` to `api/.env` and `web/.env.example` to `web/.env.local`. Set the same private `PERSONA_API_PROXY_TOKEN` (at least 32 characters) in both files. The API dev command loads its optional `.env`; the website loads `.env.local`.

## Public API entry

After the migration release, the website's `GET /api` entry serves Persona profiles without a locale redirect. `/api/coverage` and `/api/health` expose the existing metadata endpoints. `/api/people` also accepts older CLI clients that append `/people` to an API base URL. The existing `https://api-persona.osirisbalonga.me/people` endpoint remains compatible.

Persona is publicly **v1**. The existing `meta.schemaVersion: "2"` is a serialization revision already consumed by clients, not a v2 product release. This migration preserves that marker, JSON fields, seeded values, errors and validators. No `/api/v2` route is introduced.

Read the [API contract](api/docs/api.md), [country availability](api/docs/country-availability.md), and [deployment and migration procedure](api/docs/deployment.md). Publishing this PR does not switch live traffic; hosting roots and private environment variables must be configured as described there.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run lint
npm run check:cli-package
```

API unit, integration, Worker-runtime and end-to-end suites remain independently runnable through the root scripts or directly inside `api/`. CI runs `api-checks`, `web-checks` and `source-policy` on pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Website source

The website was imported from [`Osiris-Balonga/persona-web`](https://github.com/Osiris-Balonga/persona-web) at integrated `dev` commit [`9a033bf6c9ee240e81e9a8e1ce384bf3d82f8e75`](https://github.com/Osiris-Balonga/persona-web/commit/9a033bf6c9ee240e81e9a8e1ce384bf3d82f8e75). The source repository retains its history and remains available during migration. Coordinate the separate dependency remediation PRs [persona #234](https://github.com/Osiris-Balonga/persona/pull/234) and [persona-web #62](https://github.com/Osiris-Balonga/persona-web/pull/62) before release; their unmerged changes are not included in this import.

## License

[MIT](LICENSE). Third-party data and portrait assets retain the terms described in the API documentation.
