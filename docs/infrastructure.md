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
| Redeploys on | `src/**`, `public/**`, `drizzle/**`, `scripts/migrate.ts`, `package.json`, `package-lock.json`, `.nvmrc`, `.npmrc`, `next.config.ts`, `tsconfig.json` |
| Variables | `DATABASE_URL`, a reference to Postgres's; `RAILPACK_NODE_NPM_INSTALL`; and Railway's own `RAILWAY_*` |

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
  *Later*), and every apply redeploys from `main`.
- **No backups yet.** Postgres's data exists in one place until the backup
  step.
- **The first request after a quiet spell waits** while the service wakes.
