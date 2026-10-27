# 009 — The database

## Goal

Postgres runs locally for development and for the integration tests, Drizzle
manages the schema through named migrations, and CI runs the integration tests
against a Postgres of its own. There are no tables yet: each arrives with its
feature's spec. Railway's database comes with setup 010.

---

## Step 1 — `.env`

```bash
cp .env.example .env
```

Fill in `TREENIVIHKO_POSTGRES_PASSWORD`, and put the same value in both
connection strings. Use letters and digits, as `openssl rand -hex 16` gives:
a character such as `@`, `/` or `:` must be percent-encoded inside a
connection string. `.env` is never committed. The test database's
name must end in `_test`; the integration tests refuse anything else.

## Step 2 — Start Postgres

Docker must be running.

```bash
npm run db:up      # waits until Postgres answers
npm run db:migrate # "No migrations yet." until the first one exists
```

Postgres listens on **5433**, on this machine only (`127.0.0.1`), so another
project's Postgres can keep 5432 and nothing on the network reaches it. The
first start creates both databases, `treenivihko` and `treenivihko_test`; the
second is made by `docker/postgres/create-test-database.sql`, which runs only
when the volume is new. `npm run db:down` stops it, keeping the data.

## Step 3 — Run the integration tests

```bash
npm run test:integration
```

They run against `TEST_DATABASE_URL`, and refuse the whole run, before any
test, unless it is on this machine (`localhost`, `127.0.0.1` or `::1`, which is
also where CI's service container listens), it carries no query string, and
its database name ends in `_test`. A local port forwarded to a database
elsewhere would pass that check, so never point `TEST_DATABASE_URL` through a
tunnel. `npm run verify` runs
them between the unit tests and the end-to-end tests.

## Step 4 — CI's database

The `Integration tests` job starts a Postgres service container. Its password
is the repository secret `CI_POSTGRES_PASSWORD`, a random value nobody needs to
know, so no password is written in the workflow:

```bash
openssl rand -hex 24 | gh secret set CI_POSTGRES_PASSWORD --repo <your-org>/<your-repo>
```

Once the job has reported on a pull request, add it to `main`'s required checks
beside the other four (setup 005 and 007), tied to GitHub Actions, id `15368`:

```json
{ "context": "Integration tests", "integration_id": 15368 }
```

---

## Migrations

```bash
npm run db:generate -- --name=create_exercises
npm run db:migrate
```

`db:migrate` uses a client of its own, without the application's 10-second
statement timeout, since a migration on a populated table can take longer. A
migrations folder with SQL files but no journal is an error, not "no
migrations yet", and so is a SQL file the journal does not list.

| Rule | Why |
|---|---|
| A name is `<verb>_<what>`, the verb one of `add`, `create`, `alter`, `drop`, `rename`, `backfill` | Without one, drizzle-kit names a migration with two random words, which says nothing when it is read back during an incident. `db:generate` refuses, and a unit test fails on any unnamed file |
| An applied migration is never edited | A database runs each migration once. An edit never reaches the databases it already ran on, so their schema and the repository's quietly differ; a change is a new migration. CI fails a pull request that edits, deletes or renames one `main` has: `git fetch origin main && npm run db:check-history` runs the same check locally, on what is committed (`decisions/025-migration-history.md`) |
| A migration works with the version still serving | On Railway it runs before the new version takes traffic, while the old one still serves (setup 010). A column is added in one deploy and used in the next; it is dropped or renamed only once no serving version reads it |

---

## Done when

- [ ] `npm run db:up` starts Postgres, healthy
- [ ] `npm run test:integration` passes, and refuses a database not named `*_test`
- [ ] `CI_POSTGRES_PASSWORD` is a repository secret
- [ ] `Integration tests` passes on a pull request, and is required on `main`

## Next

→ `010-railway.md`
