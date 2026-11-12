# Persona Web

The Next.js website, English/French documentation and playground for Persona v1. It lives with the API under `../api/` in this repository.

## Development

Use Node.js 24 and npm. From the repository root run `npm run setup`, configure `api/.env` and `web/.env.local` using the example files, then start `npm run dev:api` and `npm run dev:web` in separate terminals. The website listens on port 3001 and the API on port 3000. Set the same private `PERSONA_API_PROXY_TOKEN` in both applications.

`NEXT_PUBLIC_PERSONA_API_URL` is the public entry, such as `http://localhost:3001/api` locally or `https://persona.osirisbalonga.me/api` in production. Without an explicit override, Next.js derives a Vercel deployment's public entry at build time. Legacy API origins remain supported by URL construction. `PERSONA_API_UPSTREAM_URL` is the separate server-only API origin used by the proxy and server data reads; it must differ from the website origin.

The `/api` entry and its health/coverage subpaths bypass locale routing. Its proxy preserves the existing response serialization marker `meta.schemaVersion: "2"`; the public product version remains v1. Portrait, age, tone, geography and pagination behavior remain unchanged. Set `NEXT_PUBLIC_PERSONA_PORTRAIT_CONTEXTS_ENABLED=false` only when explicitly targeting an older backend without plural portrait selection.

## Structure

- `src/app/[locale]`: localized pages and layouts.
- `src/app/api/[[...path]]/route.ts`: public API adapter.
- `src/lib/api-proxy.ts`: bounded authenticated upstream forwarding.
- `src/lib/config.ts`: public URLs; `src/lib/server-config.ts`: private upstream/analytics configuration.
- `src/lib/docs-content.ts`: EN/FR documentation aligned with [the API contract](../api/docs/api.md).
- `src/i18n` and `messages`: localized routing and text.

Activity retains its Cloudflare analytics origin/read credential and production/staging separation. Coverage retains its dated fallback when the upstream is unavailable. Portraits continue using the existing read-only Cloudflare Worker.

## Checks and deployment

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run these inside `web/`, or use the repository root commands. CI runs `web-checks` on PRs to `dev` and `main`. Vercel deploys this repository with Root Directory `web`; the API remains separately deployed. Read the [deployment, release and recovery guide](../api/docs/deployment.md) before reconnecting Vercel or switching production traffic. See [CONTRIBUTING.md](../CONTRIBUTING.md).

Imported from [`Osiris-Balonga/persona-web`](https://github.com/Osiris-Balonga/persona-web) dev commit [`9a033bf6c9ee240e81e9a8e1ce384bf3d82f8e75`](https://github.com/Osiris-Balonga/persona-web/commit/9a033bf6c9ee240e81e9a8e1ce384bf3d82f8e75). The original repository retains its history; this import does not archive or delete it.
