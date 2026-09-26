# Private portrait delivery

The portrait Worker reads a private R2 bucket through its binding. It has no upload, delete, or listing route. Its production manifest is currently empty, so every portrait URL returns `404` with `Cache-Control: no-store`. Locally reviewed portraits remain outside the production catalog until publication is approved.

## Publication boundary

The [review/import procedure](portrait-review.md) must approve each asset first. Upload only approved WebP files to the exact versioned `objectKey` in the manifest and set R2 custom metadata `sha256` to the reviewed file hash. Configure the manifest's HTTPS `publicBaseUrl` to the Worker's final public origin. The Worker matches the entire key against an approved catalog entry and checks R2's size and hash metadata before serving. A missing, rejected, withdrawn, replaced, or metadata-mismatched object returns `404` and `no-store`.

The R2 bucket `persona-portraits` must have no public `r2.dev` endpoint or public custom domain. Bind it to the Worker as `PORTRAITS`; do not expose R2 credentials to API clients. The Worker permits only `GET` and `HEAD`, streams successful `GET` bodies, and returns `Content-Type: image/webp`, `ETag`, `X-Content-Type-Options: nosniff`, and `Cache-Control: public, max-age=300, must-revalidate`. Query-string variants are denied so the URL remains the ordinary purgeable cache key.

## Verification and withdrawal

Before deployment, run `npm run typecheck:worker`, `npm run test:unit -- portrait-worker`, and `npm run build:worker` (Wrangler dry run). Configure the final route/domain and verify a real approved URL with `GET` and `HEAD`, an unknown ID, and the bucket's private exposure settings. No Worker deployment should be treated as complete until these live checks pass.

To withdraw an asset, remove its approval and deploy the new manifest first, then [purge its exact public URL globally](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/) and verify that a fresh `GET` and `HEAD` both return `404` with `no-store`. Purging only a local Worker Cache API entry does not evict the CDN globally. Previously fetched browser copies may remain fresh for up to five minutes. Replacements use a new versioned key; never overwrite an approved key in place.
