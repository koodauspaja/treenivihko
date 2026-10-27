# 026 — Railway

## Context

The app needs a home on the internet before sign-in (011) can register its
callback. Decision 023 left one thing to this step: where migrations run on
deploy, kept to one place. The project has one environment, by agreement, and
the app is used a few times a week.

## Decision

- **The whole Railway project is code, in `.railway/railway.ts`**: Postgres,
  the web service, its variables and every setting. Nothing is set by hand in
  the dashboard. Railway's Infrastructure as Code, applied from a machine with
  `railway config plan` and `apply`. The one thing the format cannot hold, the
  generated domain, is made by command (`railway domain`).
- **Postgres is declared in the file, and a unit test pins the declaration.**
  An apply deletes what the file no longer declares, data included.
- **One environment, `production`, in `europe-west4`**, under Railway's stored
  name for it, `europe-west4-drams3a`.
- **`main` deploys after CI passes** (`checkSuites`), from the Railway GitHub
  app's access to this repository.
- **Migrations run in the pre-deploy step**, `npm run db:migrate`, in the new
  container before it takes traffic. That is the one place they run.
- **`/api/health` is the health check**: `ok` when the database answers
  within three seconds, `503` when it does not, with the deployed commit. It
  calls `connection()`, so it is never prerendered: the build has no database.
- **Next is started directly**, `node node_modules/next/dist/bin/next start`.
- **The service sleeps when idle.** The database client closes connections
  left idle for 20 seconds.
- **npm 12 runs the install**, through `RAILPACK_NODE_NPM_INSTALL`:
  `npx --yes npm@12.2.1 ci --ignore-scripts`.
- **Watch paths limit deploys** to application code and its build
  configuration.
- **The domain is `treenivihko.up.railway.app`.**

## Why

| Decision | Why |
|---|---|
| Infrastructure as Code, not `railway.json` | `railway.json` is deprecated, and stops working on 2026-12-01 |
| Everything in the file, not partly in the dashboard | One place to read what runs, and a plan that shows any drift |
| Postgres in the same file | The alternative, keeping it out so no apply can touch it, splits the project between the file and the dashboard. The unit test is the guard instead |
| The region's stored name | Measured on the earlier project: with the short name the database is created in the same place, and every later plan shows a move, which the CLI counts as destructive |
| Wait for CI | Merging starts CI's push run and Railway's deploy at the same moment. Waiting holds the deploy until the checks on that commit pass, and skips it if any fail, so a commit CI rejected never serves. The cost is a few minutes per deploy, and a skipped deploy is redeployed by hand once CI is green |
| Migrations before traffic | A version that needs a new column never serves without it; a failed migration stops the deploy and the old version keeps serving |
| A three-second database timeout in the health check | Railway's check waits up to 60 seconds; a check that hangs as long as the driver's own 30-second connect timeout says nothing more |
| Next started directly | `npm start` runs the script through `sh -c`, and that shell dies on Railway's SIGTERM while the server never receives it |
| Sleeping, and the idle timeout | Used a few times a week, so idle hours are most of the bill. Railway sleeps a service only after its last outbound packet; postgres.js keeps idle connections open and sends a keepalive on each every minute, so it would never sleep |
| npm 12 through `npx` | `package.json` requires npm 12, and `.npmrc`'s `engine-strict` refuses anything older. Node 24 ships npm 11. Railpack's Corepack step leaves npm as it is (measured: `npm -v` answers 11 after it), and a global install lands off Railpack's path, so `npm ci` still ran as npm 11. Install scripts are skipped, as in CI |
| Watch paths | A documentation-, decision- or test-only merge deploys nothing. `.railway/railway.ts` is not among them: Railway never reads it on deploy |
| No GitHub workflow that builds environments | One environment, made once; a command sequence in setup 010 is enough |

## Consequences

- **A merged change to `.railway/railway.ts` does nothing until it is
  applied.** Every apply also redeploys the service from `main`.
- **A branch is tried with `railway up`, then a redeploy.** An upload that
  changes only unwatched files is skipped, and a redeploy ignores the watch
  paths.
- **The commit shows only on deploys from GitHub.** A `railway up` upload
  carries none, and the health route answers `null`.
- **The first request after a quiet spell waits** while the service wakes.
- **No backups yet.** They are a step of their own, before real data goes in.
- **A clone needs a domain name of its own**: only one project holds
  `treenivihko.up.railway.app`.
