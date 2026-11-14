# Infrastructure

What runs, and where. It describes the running system; `docs/setup/` is the
procedure that builds it from zero. Everything Railway holds is declared in
`.railway/railway.ts` (`decisions/026-railway.md`).

## Railway

Project `treenivihko`, in the Koodauspaja workspace, with one environment,
`production`, in `europe-west4`.

| Service | What | Reached |
|---|---|---|
| `treenivihko` | The web app, from `main` | <https://treenivihko.up.railway.app> |
| `Postgres` | Postgres 18 (`postgres-ssl:18`), holding the app's data | Only on Railway's private network: no public TCP proxy |
| `backup` | A cron service: each night's dump of Postgres into `backups` | Nothing reaches it; it runs and exits |
| `backups` | A private bucket, in Amsterdam, holding the newest 14 dumps | With the bucket's credentials, which Railway shows the workspace's members |

### The web service

| Setting | Value |
|---|---|
| Source | `koodauspaja/treenivihko`, branch `main` |
| Waits for CI | Yes: a deploy waits for the checks on its commit, and is skipped if any fail |
| Install | `npx --yes npm@12.2.1 ci --ignore-scripts` |
| Build | `npm run build` |
| Before traffic | `npm run db:migrate`, under a Postgres advisory lock, so two overlapping deploys migrate one after the other |
| Start | `node node_modules/next/dist/bin/next start` |
| Health check | `/api/health`, up to 60 s |
| Restarts | On failure, at most 3 times |
| Sleeps when idle | Yes; wakes on the next request |
| Redeploys on | `src/**`, `public/**`, `drizzle/**`, `scripts/migrate.ts`, `scripts/set-trainer-password.ts`, `scripts/trainer-password-plan.ts`, `package.json`, `package-lock.json`, `.nvmrc`, `.npmrc`, `next.config.ts`, `tsconfig.json` |
| Variables | `DATABASE_URL`, a reference to Postgres's; `RAILPACK_NODE_NPM_INSTALL`; `BETTER_AUTH_URL`, a reference to the service's domain; `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `AUTH_ALLOWED_EMAILS`, set on Railway and kept by every apply (`docs/setup/011-sign-in.md`); and Railway's own `RAILWAY_*` |

### The backup

| Setting | Value |
|---|---|
| Source | `koodauspaja/treenivihko`, branch `main`, waiting for CI like the web service |
| Build | `docker/backup/Dockerfile`: `postgres:18-alpine` with the AWS CLI, run as `postgres` |
| Runs | Every night from 01:00 UTC, which Railway starts within a few minutes, then exits |
| What it does | `pg_dump --format=custom` over the private network, uploads `treenivihko-<UTC time>.dump`, then removes all but the newest 14 dumps |
| Logs | Each table's row count, `uploaded: <name>, <bytes> bytes`, and each `removed: <name>`; never a row |
| Deadline | One hour, then a kill a minute later: a run that hangs fails, since Railway starts no cron run while one still runs |
| Restarts | Never: a failed night shows as failed, and the next runs as usual |
| Redeploys on | `docker/backup/**`, in the last commit of a push: Railway skipped a build whose earlier commits changed it, and it is then redeployed by hand (`decisions/080-backup-deadline.md`) |
| Variables | `DATABASE_URL`, a reference to Postgres's; `BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` and `AWS_ENDPOINT_URL`, references to the bucket's |

Restoring one, and the drill that checks one restores: `docs/setup/012-backups.md`
(`decisions/063-database-backups.md`, `decisions/080-backup-deadline.md`).

### The health route

`GET /api/health` answers whether the database answers, within 3 seconds, and
which commit runs:

```json
{ "status": "ok", "database": "ok", "commit": "…" }
```

`503` with `"status": "unavailable"` and `"database": "unreachable"` when the
database does not answer, and the reason on the service's log as one
`health check:` line. `commit` is `null` on a deploy uploaded with
`railway up`.

## Constraints

- **Railway never reads `.railway/railway.ts` during a deploy.** A merged
  change takes effect when it is applied (`docs/setup/010-railway.md`,
  *Later*), and redeploys from `main` the services whose settings it changes.
- **A backup is up to a day old**, and lives in the same Railway project as
  the database: it covers a bad migration or a lost volume, not the loss of
  the Railway account. Before a risky migration, dump it by hand as well
  (`docs/setup/010-railway.md`, *Later*).
- **The backup's Postgres image is never older than Railway's**, which
  `pg_dump` refuses: raise `docker/backup/Dockerfile` with Postgres.
- **The first request after a quiet spell waits** while the service wakes.
