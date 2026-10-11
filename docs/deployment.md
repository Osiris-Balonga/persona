# Production deployment

The production API runs as a separate Hostinger Node.js application at `https://api-persona.osirisbalonga.me`. The site remains on Vercel at `https://persona.osirisbalonga.me`. Render's `https://persona-dev.onrender.com` service tracks `dev` for staging. Production tracks `main` in `Osiris-Balonga/persona`; do not deploy into the portfolio application at the parent domain.

## Hostinger build and runtime

Use Node.js 24, Fastify, npm, application root `.`, output directory `.`, build script `build`, and entry file `dist/index.js`. Keeping the application root preserves the package manifest and runtime dependencies alongside compiled files. Upload source only when testing an archive; exclude dependencies, generated builds, credentials and local work files. Normal production releases use the connected GitHub repository and `main` branch.

Configure `NODE_ENV=production`, `NPM_CONFIG_INCLUDE=dev` so TypeScript is installed for the server-side build, and `TRUSTED_PROXIES=127.0.0.1`. This proxy address was observed on the deployed Hostinger application; reverify it after a hosting or proxy migration. Do not trust all addresses or set Render-specific variables on Hostinger. The platform supplies the listening `PORT`; the server binds to `0.0.0.0`.

Configure `ANALYTICS_INGEST_URL=https://persona-analytics.osirisbalonga.workers.dev/v1/events` and the separate production ingest credential as `ANALYTICS_INGEST_TOKEN`. Secrets belong in hosting configuration, never Git. Hostinger's environment API replaces the entire variable set: preserve real values when editing and never copy masked placeholders back into it.

The Hostinger edge redirects HTTP to HTTPS. The application's HTTPS requirement must remain enabled. Before release, verify successful HTTPS requests, rejected invalid filters, CORS, seeded replay, portraits, and per-client rate limiting. Spoofed forwarding headers must not reset a client's rate-limit bucket or bypass HTTPS. A completed build does not establish these checks.

## Site configuration

Vercel production uses `NEXT_PUBLIC_PERSONA_API_URL=https://api-persona.osirisbalonga.me`, `NEXT_PUBLIC_SITE_URL=https://persona.osirisbalonga.me`, and server-only `ANALYTICS_ENVIRONMENT=production`. Keep the existing analytics Worker origin and server-only read token. Preview and development deployments remain connected to Render and staging analytics. Changing public build-time variables requires a new site build.

Change only the `persona` DNS record for Vercel and `api-persona` for Hostinger. Obtain their targets from the actual projects; preserve the parent domain, unrelated websites, email records and nameservers.

## Release and recovery

Take verified analytics snapshots and perform the one-time history import described in [analytics.md](analytics.md) before switching public site traffic. This preserves pre-production history without mixing future staging traffic into production. MariaDB is not required; the existing SQLite Durable Objects and private R2 backups remain the storage system.

Merge reviewed working branches into `dev`, check the exact release head and required CI, then promote `dev` to `main` with a merge commit. Verify the Hostinger build uses that commit before promoting the site. Check `/health`, `/coverage`, representative `/people` requests, portrait delivery and the public activity page on the actual production URLs.

Retain the previous successful source archive or Git commit, build settings and private environment configuration. Rebuild the previous source with the same settings to roll back application code; verify health and representative responses again. A rollback must not change Worker identities, Durable Object bindings or portrait storage, and does not undo the history import. Do not restore an old analytics snapshot over newer live usage. Until both new origins have passed public checks, the existing site deployment and Render staging origin remain available as the application fallback.
