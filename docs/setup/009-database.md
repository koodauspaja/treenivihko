# 009 — The database

## Goal

Postgres runs locally for development and for the integration tests, Drizzle
manages the schema through named migrations, and CI runs the integration tests
against a Postgres of its own. There are no tables yet: each arrives with its
feature's spec. Railway's database comes with the Railway step.

---

## Step 1 — `.env`

```bash
cp .env.example .env
```

Fill in `TREENIVIHKO_POSTGRES_PASSWORD` with any value, and put the same value
in both connection strings. `.env` is never committed. The test database's
name must end in `_test`; the integration tests refuse anything else.

## Step 2 — Start Postgres

Docker must be running.

```bash
npm run db:up      # waits until Postgres answers
npm run db:migrate # "No migrations yet." until the first one exists
```

Postgres listens on **5433**, so another project's Postgres can keep 5432. The
first start creates both databases, `treenivihko` and `treenivihko_test`; the
second is made by `docker/postgres/create-test-database.sql`, which runs only
when the volume is new. `npm run db:down` stops it, keeping the data.

## Step 3 — Run the integration tests

```bash
npm run test:integration
```

They run against `TEST_DATABASE_URL`, and refuse the whole run, before any
test, when its database name does not end in `_test`. `npm run verify` runs
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

| Rule | Why |
|---|---|
| A name is `<verb>_<what>`, the verb one of `add`, `create`, `alter`, `drop`, `rename`, `backfill` | Without one, drizzle-kit names a migration with two random words, which says nothing when it is read back during an incident. `db:generate` refuses, and a unit test fails on any unnamed file |
| Renaming a migration's file and journal tag together is safe | The migrator finds a migration by its tag and checks its contents' hash |
| Editing an applied migration is not | Its hash changes, and the next migration of every database it ran on fails; add a new migration instead |

---

## Done when

- [ ] `npm run db:up` starts Postgres, healthy
- [ ] `npm run test:integration` passes, and refuses a database not named `*_test`
- [ ] `CI_POSTGRES_PASSWORD` is a repository secret
- [ ] `Integration tests` passes on a pull request, and is required on `main`

## Next

→ `010`, Railway, once it is written.
