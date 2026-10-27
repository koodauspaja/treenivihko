# 023 — The database

## Context

The features will store programs, sessions and marks. The stack was chosen in
the README: Postgres, with Drizzle. This step sets up the database without any
table, so that each table arrives with the spec that needs it.

## Decision

- **Postgres 18 in Docker locally, on port 5433**, so another project's
  Postgres can keep 5432. Its password comes from `.env`; Compose refuses to
  start without it.
- **Two databases**: `treenivihko` for development and `treenivihko_test` for
  the integration tests, made when the volume is first created.
- **Drizzle with postgres.js.** The client is made on first use, so importing
  the database needs no `DATABASE_URL`, and every statement has a 10-second
  timeout, so a stalled query fails instead of holding a request.
- **Named migrations only.** `db:generate` refuses a migration without a
  `<verb>_<what>` name, and a unit test fails on any file or journal entry
  without one. An applied migration is never edited.
- **No migrations yet is a normal state.** Drizzle's migrator fails without a
  journal, so `runMigrations` answers "none" until the first migration exists.
- **The integration tests run only against a database named `*_test`.** A
  guard refuses the whole run, before any test file loads, and says why. It
  reads `TEST_DATABASE_URL`, which the project gives its tests as
  `DATABASE_URL`, because a project's `env` does not reach `globalSetup`; and
  it prints its reason and exits, because a thrown error's message is lost
  there.
- **CI's Postgres password is a secret** with a random value. A password
  written in the workflow is a credential the workflow holds, however
  throwaway the container.
- **Unit coverage counts unit tests only.** The integration tests are a
  separate project and do not add to it; the code they exercise beyond the
  unit tests is the thin scripts excluded with their reasons.

## Why

- Tables written before their spec would be guesses about features not yet
  agreed.
- The earlier project reached main with seven migrations named by
  drizzle-kit's random words before anyone noticed; a refusal at generation
  and a test behind it stop that at the first one.

## Consequences

- A clone needs Docker for `npm run verify`, since it runs the integration
  tests.
- The test database is created only with a new volume. An older volume needs
  `docker compose down --volumes` once, which also empties the development
  database.
