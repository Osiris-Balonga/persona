# Private portrait delivery

The portrait Worker reads a private R2 bucket through its binding. It has no upload, delete, or listing route. The versioned production manifest lists the approved portraits and their SHA-256 values.

## Publication boundary

The [review/import procedure](portrait-review.md) must approve each asset first. Upload only approved WebP files to the exact versioned `objectKey` in the manifest and set R2 custom metadata `sha256` to the reviewed file hash. Configure the manifest's HTTPS `publicBaseUrl` to the Worker's final public origin. The Worker matches the entire key against an approved catalog entry and checks R2's size and hash metadata before serving. A missing, rejected, withdrawn, replaced, or metadata-mismatched object returns `404` and `no-store`.

The R2 bucket `persona-portraits` must have no public `r2.dev` endpoint or public custom domain. Bind it to the Worker as `PORTRAITS`; do not expose R2 credentials to API clients. The Worker permits only `GET` and `HEAD`, streams successful `GET` bodies, and returns `Content-Type: image/webp`, `ETag`, `X-Content-Type-Options: nosniff`, and `Cache-Control: public, max-age=300, must-revalidate`. Query-string variants are denied so the URL remains the ordinary purgeable cache key.

For this account, the public origin is `https://persona-portraits.osirisbalonga.workers.dev`. The R2 bucket itself stays private. To publish a reviewed batch, run `npm run portraits:audit-review`, then start `npx wrangler dev --config wrangler.portraits-upload.jsonc --ip 127.0.0.1 --port 8788`. In another terminal run `npm run portraits:publish`. The local upload Worker uses a remote R2 binding, checks each payload hash, records it as R2 custom metadata, and refuses to overwrite a changed key. The publishing command checks all reviewed files before uploading and writes the versioned manifest only after every object succeeds. Stop the local upload Worker when finished. It is never deployed publicly.

The review console continues to use local, Git-ignored masters, optimized WebPs, and review state. Approved WebPs are copied to R2; neither the image files nor the local review state are committed to GitHub. Changes made in the console after publication require another reviewed import and Worker deployment.

## Verification and withdrawal

Before deployment, run `npm run typecheck:worker`, `npm run test:unit -- portrait-worker`, and `npm run build:worker` (Wrangler dry run). Configure the final route/domain and verify a real approved URL with `GET` and `HEAD`, an unknown ID, and the bucket's private exposure settings. No Worker deployment should be treated as complete until these live checks pass.

To withdraw an asset, remove its approval and deploy the new manifest first, then [purge its exact public URL globally](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/) and verify that a fresh `GET` and `HEAD` both return `404` with `no-store`. Purging only a local Worker Cache API entry does not evict the CDN globally. Previously fetched browser copies may remain fresh for up to five minutes. Replacements use a new versioned key; never overwrite an approved key in place.
