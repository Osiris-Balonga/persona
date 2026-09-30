# Persona CLI

A non-interactive Node.js 24 CLI for public v2 profile fixtures and developer-owned seeders. The executable is `persona`. It does not include the API server or require an API key.

The package is not published to npm yet. Its provisional name is `@osiris-balonga/persona-cli`, and `private: true` prevents accidental publication until registry ownership and release configuration are confirmed. Commands such as `npm install @osiris-balonga/persona-cli` are **not available** at this stage.

## Install from source

From the Persona repository:

```sh
npm ci
npm run build:cli
npm pack ./packages/cli --pack-destination <directory-outside-the-repository>
```

From your application directory, install the resulting archive:

```sh
npm install --save-dev /absolute/path/osiris-balonga-persona-cli-0.1.0.tgz
npx persona
npx persona --help
```

An optional global installation of that archive enables `persona` directly. For repository development, use `npm run cli -- <arguments>`. No installation hook, first-run marker, login, or prompt is created. The existing Persona mark is rendered with terminal block characters on bare invocation and help. Color is used only on a terminal; `--no-color` and `NO_COLOR` disable it.

## Generate fixtures

```sh
npx persona people --count 20 --nationality CG --age-group adult --seed demo --as-of 2026-09-30 --output prisma/fixtures/people.json
```

Without `--output`, stdout contains only the v2 JSON envelope, including `results` and replay `meta`. Progress and errors go to stderr. Parent directories are created for file output. Existing files are preserved unless `people --force` is supplied; forced replacement is written to a temporary sibling first, so a failed write does not truncate existing fixtures. Exit status is 0 on success and 1 on failure.

```sh
npx persona people --count 10 > people.json
npx persona people --nationality FR --residence-country CG --city Brazzaville
npx persona people --fields name.first,email,picture.thumbnail
```

| Option | API parameter / purpose |
| --- | --- |
| `--count` | `count`: 1–100, default 1 |
| `--gender` | `gender`: male or female |
| `--age-group` | `ageGroup`: child, teen, adult, senior; comma-separated |
| `--nationality` | `nationality`: uppercase reviewed two-letter code |
| `--residence-country` | `residenceCountry`: uppercase residence code |
| `--continent` | `continent`: africa, americas, asia, europe, oceania |
| `--city` | `city`: city in the selected residence country |
| `--email-domain` | `emailDomain`: default example.test |
| `--seed` | `seed`: replay seed |
| `--as-of` | `asOf`: YYYY-MM-DD reference date |
| `--fields` | `fields`: comma-separated public field paths |
| `--output` | Save the entire response to a file |
| `--force` | Replace an existing output file; requires --output |
| `--api-url` | API base URL override |

The [API contract](https://github.com/Osiris-Balonga/persona/blob/dev/docs/api.md) defines filter validation, projection and replay semantics. Unknown or repeated CLI options are rejected; the API validates filter values. There are no numeric-age or appearance filters, automatic batches, automatic retries, or offline person generation. Requests time out after 30 seconds; responses exceeding the API's 256 KiB limit are rejected. Errors include HTTP status, API code and retry hints when supplied.

**The default API is Render staging**, `https://persona-dev.onrender.com`, while production preparation remains open. Override it with `--api-url http://localhost:3000` or the `PERSONA_API_URL` environment variable; the explicit option takes precedence. Supply a base URL, not `/people`. HTTP(S) URLs cannot include credentials, query strings or fragments; redirects are rejected.

For replay, keep both `--seed` and `--as-of` and retain metadata. The same input only repeats against unchanged data, catalogue and generation algorithm versions. Contacts are test data; never contact them. Some phones may belong to real subscribers. City coordinates do not identify the synthetic street.

## Inspect country coverage

```sh
npx persona countries
npx persona countries --available
npx persona countries --country CG
npx persona countries --json
```

The bundled JSON snapshot contains `dataVersion` and `countries`, generated from the same catalogues as the repository country table. It is not a live server capability endpoint and may differ from an API using another data version. Each row reports code, name, profile readiness, sampled cities, cities with postcodes, and phone source. A recognized code is not necessarily profile-available. Pending name review does not imply that residence cities are unavailable. `--available` filters profile readiness, not complete field coverage. Postcodes cover only sampled cities, and format-valid phones are not reserved.

Maintainers regenerate both outputs with `npm run data:availability`. CI runs `npm run data:availability:check` to detect drift.

## Prepare a Prisma seeder

```sh
npx persona seed init --adapter prisma
```

This creates `prisma/seed.ts` only. It reads `fixtures/people.json` relative to the seed file, validates the fields required by its example mapping, transforms profiles and exposes an insertion function. It does not generate fixtures, modify your schema/configuration/package.json, install Prisma, discover your database credentials or connect to a database. It refuses to overwrite an existing file.

Before executing it:

1. Adapt `mapPerson` to your schema, including required fields and relations.
2. Import your application's configured Prisma client using the correct path. Prisma 7 requires a driver adapter; the template does not guess your provider or initialization.
3. Replace the explicit error in `insertPeople` with the commented insertion example, adapting the model and unique key. The example uses an upsert inside a transaction and disconnects in `finally`.
4. Generate **full** fixtures without `--fields`, or adapt the reader contract to your projection.

```sh
npx persona people --count 20 --nationality CG --age-group adult --seed demo --as-of 2026-09-30 --output prisma/fixtures/people.json
```

The template intentionally stops until insertion is adapted. There is no automatic schema mapping. An agent can read your schema and adapt the generated file, but application rules remain yours to review.

In an existing Prisma 7 project, add the seed command to the existing `migrations` configuration in `prisma.config.ts`, preserving its other settings:

```ts
migrations: {
  // Keep your existing migration settings here.
  seed: 'tsx prisma/seed.ts',
},
```

If your project does not already have `tsx`, install it as a development dependency. After checking the target database, explicitly run:

```sh
npx prisma db seed
```

This is the application seeder execution step, separate from `persona seed init`. Use the configuration appropriate for your installed Prisma version. See the [Prisma seeding guide](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding) for current configuration and client adapter requirements.

Alternatively, add application-owned npm scripts:

```json
{
  "scripts": {
    "fixtures:people": "persona people --count 20 --nationality CG --age-group adult --seed demo --as-of 2026-09-30 --output prisma/fixtures/people.json --force",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

Then use `npm run fixtures:people` and `npm run db:seed`. For repeated insertion, choose an idempotency key appropriate for your model; changing seeds or email domains may create additional rows.

## Other database tools

```sh
npx persona seed init --adapter generic
```

This creates `scripts/seed.ts` with the same fixture reader and example mapping. Implement `insertPeople` with Drizzle, another ORM or your own database client, including cleanup and transaction rules. Fixtures belong in `scripts/fixtures/people.json` by default. Use `--output <file>` with either adapter to choose the seed file location; fixtures remain relative to that file. Existing seed files are never overwritten.

## Maintainer checks

```sh
npm run typecheck:cli
npm run build:cli
npm run check:cli-package
npm run test:unit
npm run test:integration
npm run test:e2e
```

The package check installs a local npm archive into a temporary application, verifies the executable and packaged resources, and removes the temporary files. It never publishes a package. E2E tests require a built CLI (`npm run build:cli`) and use a local HTTP API; they do not insert into an external database.
