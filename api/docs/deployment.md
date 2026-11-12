# Production deployment

The API remains a separate Hostinger Node.js application at `https://api-persona.osirisbalonga.me`. The Vercel site at `https://persona.osirisbalonga.me` exposes `GET /api` as the public generation entry after this migration is released. The old `/people`, `/coverage` and `/health` paths on the Hostinger origin remain compatible. Render's `https://persona-dev.onrender.com` service tracks `dev` for staging. Both applications now use `Osiris-Balonga/persona`: production tracks `main`, staging/previews use the reviewed integration branch. Do not deploy into the portfolio application at the parent domain.

Persona remains publicly v1. This repository migration does not alter the existing JSON serialization revision or introduce a v2 route.

## Hostinger build and runtime

Use Node.js 24, Fastify, npm, application root `api`, output directory `.`, build script `build`, and entry file `dist/index.js` relative to that application root. Install with `npm ci` inside `api/`. Configure Render's Root Directory as `api`, build command `npm ci && npm run build`, and start command `npm start`. Keeping each application root preserves its manifest and runtime dependencies alongside compiled files. Upload source only when testing an archive; exclude dependencies, generated builds, credentials and local work files. Normal production releases use the connected GitHub repository and `main` branch.

Configure `NODE_ENV=production`, `NPM_CONFIG_INCLUDE=dev` so TypeScript is installed for the server-side build, and `TRUSTED_PROXIES=127.0.0.1`. This proxy address was observed on the deployed Hostinger application; reverify it after a hosting or proxy migration. Do not trust all addresses or set Render-specific variables on Hostinger. The platform supplies the listening `PORT`; the server binds to `0.0.0.0`.

Configure `ANALYTICS_INGEST_URL=https://persona-analytics.osirisbalonga.workers.dev/v1/events` and the separate production ingest credential as `ANALYTICS_INGEST_TOKEN`. Secrets belong in hosting configuration, never Git. Hostinger's environment API replaces the entire variable set: preserve real values when editing and never copy masked placeholders back into it.

The Hostinger edge redirects HTTP to HTTPS. The application's HTTPS requirement must remain enabled. Before release, verify successful HTTPS requests, rejected invalid filters, CORS, seeded replay, portraits, and per-client rate limiting. Spoofed forwarding headers must not reset a client's rate-limit bucket or bypass HTTPS. A completed build does not establish these checks.

## Site configuration

Reconnect the existing Vercel project to `Osiris-Balonga/persona` and set its Root Directory to `web`, install command `npm ci`, build command `npm run build`, and framework Next.js. Preserve its domains, analytics history and private environment settings. Do not create a replacement project or archive `persona-web` as part of the source PR.

Vercel production uses `NEXT_PUBLIC_PERSONA_API_URL=https://persona.osirisbalonga.me/api`, `NEXT_PUBLIC_SITE_URL=https://persona.osirisbalonga.me`, server-only `PERSONA_API_UPSTREAM_URL=https://api-persona.osirisbalonga.me`, and `ANALYTICS_ENVIRONMENT=production`. Keep the analytics Worker origin and server-only read token. Set `PERSONA_API_UPSTREAM_URL=https://persona-dev.onrender.com` for previews; keep staging analytics there. Remove the old preview public API-origin override to derive `/api` from the Vercel preview hostname, or explicitly configure that deployment's public entry. Changing public build-time variables requires a new build.

Set the same private `PERSONA_API_PROXY_TOKEN` (at least 32 random characters) on the website and its corresponding API environment. Use separate production and staging tokens. The API remains keyless for public callers; the token only authenticates the server-to-server visitor-IP claim. It must never use a `NEXT_PUBLIC_` name. The web proxy overwrites caller-supplied identity/token headers, forwards the edge-written `x-forwarded-for` IP only when hosted on Vercel, and excludes cookies and Authorization. The API accepts that client-IP claim only with the matching token; otherwise its existing Hostinger/Render IP logic applies. On other hosting providers, implement and test their edge identity adapter before relying on per-visitor buckets. Never enable universal proxy trust.

The proxy serves only `/api`, `/api/people`, `/api/coverage` and `/api/health`; slash variants of these web paths are accepted without redirecting. It preserves query strings, conditional requests, CORS, errors and rate-limit headers. Requests have a 15-second upstream deadline, and redirects from an upstream become a generic 502. Missing/invalid proxy configuration returns 503. `PERSONA_API_UPSTREAM_URL` must be an HTTP(S) origin without a path, query or credentials; HTTP is allowed only on loopback for local development. It must differ from the website origin to avoid a proxy loop. Server rendering and build-time data reads use the direct upstream, so building a preview does not require the new public entry to be live first.

Change only the `persona` DNS record for Vercel and `api-persona` for Hostinger. Obtain their targets from the actual projects; preserve the parent domain, unrelated websites, email records and nameservers.

## Monorepo release order

The source PR changes no hosting settings or public traffic. The website import is the integrated `persona-web` dev commit `9a033bf6c9ee240e81e9a8e1ce384bf3d82f8e75`; its original repository keeps the full history. Coordinate outstanding dependency fixes persona #234 and persona-web #62 before release, adapting the latter's paths under `web/`.

1. Verify `api-checks`, `web-checks` and `source-policy` at the exact PR head. Retain required API/source checks and add the web check to protected branches when the imported workflow exists there; do not leave older open PRs waiting for a workflow they do not contain. Check actual server settings rather than treating workflow files as protection.
2. Configure the Render application root and staging token for the consolidated source, verify its new and legacy routes, then test a web preview against that upstream. Verify two clients retain separate rate-limit buckets, and forged proxy headers do not bypass quotas.
3. Promote reviewed `dev` to `main` with a merge commit. Coordinate the Hostinger root switch to `api` with that source revision and configure its production proxy token. Verify the old origin before enabling the website's new public entry.
4. Reconnect the Vercel source/root and production environment, build and test the intended deployment, then assign the existing domain. Verify `/api`, `/api/`, `/api/coverage`, `/api/health`, errors, GET/HEAD/OPTIONS, ETag/304, 429/Retry-After, analytics and the playground in both languages. Compare seeded `/api` output with the legacy `/people` response.
5. Retain the original web repository and previous deployment during verification. Archive it only as a separate approved operation after the consolidated site passes acceptance. No Worker identities, Durable Object bindings or portrait objects need to change.

Record each hosting root, Git source and environment configuration before switching. Rolling source back to a pre-migration commit also requires restoring the corresponding old application root and Vercel repository link; do not roll code back while leaving an incompatible root selected. Preserve incoming analytics data throughout recovery.

## Release and recovery

Take verified analytics snapshots and perform the one-time history import described in [analytics.md](analytics.md) before switching public site traffic. This preserves pre-production history without mixing future staging traffic into production. MariaDB is not required; the existing SQLite Durable Objects and private R2 backups remain the storage system.

Merge reviewed working branches into `dev`, check the exact release head and required CI, then promote `dev` to `main` with a merge commit. Verify the Hostinger build uses that commit before promoting the site. Check `/health`, `/coverage`, representative `/people` requests, portrait delivery and the public activity page on the actual production URLs.

Retain the previous successful source archive or Git commit, build settings and private environment configuration. Rebuild the previous source with the same settings to roll back application code; verify health and representative responses again. A rollback must not change Worker identities, Durable Object bindings or portrait storage, and does not undo the history import. Do not restore an old analytics snapshot over newer live usage. Until both new origins have passed public checks, the existing site deployment and Render staging origin remain available as the application fallback.
