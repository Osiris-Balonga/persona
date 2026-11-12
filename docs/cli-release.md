# CLI release

The public package is `@osiris_balonga/persona-cli`; the executable is `persona`.
The API repository remains private to npm publication through its root manifest.
Only `packages/cli` is publishable. Node.js 24 is required.

Before publishing a reviewed, integrated commit:

1. Confirm the version is unused with `npm view @osiris_balonga/persona-cli version`.
2. Run `npm ci`, `npm run data:availability:check`, `npm run typecheck:cli`,
   `npm run check:cli-package`, and the unit, integration and end-to-end suites.
3. Run `npm whoami` and confirm ownership of the `osiris_balonga` scope.
4. Run `npm pack ./packages/cli --pack-destination <external-release-directory>`.
   The prepack script compiles TypeScript, so compilation failures prevent packing.
5. Inspect the archive contents and install that archive in a clean temporary app.
   Verify `persona --version`, `persona --help`, countries and seed scaffolding.
6. Run `npm publish <archive-path> --access public --dry-run`, then publish the
   same inspected archive with `npm publish <archive-path> --access public`.
   Complete any npm authentication or second-factor challenge interactively;
   never put credentials in repository files or command examples.
7. Read back `npm view @osiris_balonga/persona-cli@0.1.0 version dist.integrity`,
   install from the registry in a clean app, and verify the executable again.
   Record the source commit and archive integrity in the release notes.

The first release is `0.1.0`. Do not advertise a registry release until readback
succeeds. A dry run is packaging verification and does not prove publish rights.
For future releases, increment the package version through a reviewed PR; do not
overwrite an existing version. Keep the website installation guidance synchronized.

After publication, consumers can install with:

```sh
npm install --save-dev @osiris_balonga/persona-cli
npx persona --help
npx persona people --count 1000 --limit 100 --output fixtures/people.json
```

Bulk requests require a deployed API with cursor pagination support. The CLI's
default endpoint is Render staging; use `--api-url` or `PERSONA_API_URL` to choose
the intended deployment. Installing the package does not deploy or upgrade the API.
