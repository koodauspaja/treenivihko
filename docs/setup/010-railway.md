# 010 — Railway

## Goal

The app runs on Railway: one environment, its own Postgres, migrations before
each deploy takes traffic, and a health check. Everything Railway holds is
declared in `.railway/railway.ts` and applied from your machine; nothing is
set by hand in the dashboard. Why it is built this way:
`decisions/026-railway.md`. What now runs: `docs/infrastructure.md`.

---

## Step 1 — Make the file yours

`.railway/railway.ts` names this project. Change these, and the same values in
`tests/unit/config/railway.test.ts`:

| In the file | This project |
|---|---|
| The repository in `github(…)` | `koodauspaja/treenivihko` |
| The service's and the project's name | `treenivihko` |
| `REGION`, Railway's stored name for it | `europe-west4-drams3a` |

## Step 2 — Railway

1. <https://railway.com>: sign in with GitHub, on the Hobby plan.
2. Railway's GitHub app, on your organisation, with access to this repository:
   GitHub → your organisation's **Settings** → **GitHub Apps** → Railway →
   **Configure** → **Repository access**. Without it nothing deploys on a
   push, and Wait for CI does not save.
3. The CLI:

   ```bash
   brew install railway     # tested with 5.62.1
   railway login
   ```

## Step 3 — Create the project from the file

```bash
railway whoami --json      # your workspace's id, under "workspaces"
railway init --name treenivihko --workspace <workspace id>
railway config plan        # 2 to add: Postgres and treenivihko. Nothing else
railway config apply
```

`railway init` links this directory to the new project's only environment,
`production`. Read the plan before applying: on an empty project it adds
exactly the two services, and nothing is changed or destroyed.

The apply starts a deploy of `main` straight away.

## Step 4 — The domain

```bash
railway domain -s treenivihko
railway domain update <the generated domain> --domain treenivihko -s treenivihko
```

The first makes Railway's `<service>-<environment>.up.railway.app`, and the
second renames it. Only one project can hold a name: a clone picks its own.

## Step 5 — Check it

```bash
railway config plan        # "already up to date"
curl -s https://treenivihko.up.railway.app/api/health
```

```json
{ "status": "ok", "database": "ok", "commit": "…" }
```

`commit` is the commit the deploy runs. It is `null` for a deploy uploaded
with `railway up`, which carries none.

Postgres has no public TCP proxy:

```bash
railway tcp-proxy list -s Postgres   # "No TCP proxies found"
```

---

## Later

- **A change to `.railway/railway.ts` takes effect only when applied.**
  Merging it does nothing. After the merge: `railway config plan`, read it,
  then `railway config apply`. An apply removes whatever the file no longer
  declares, Postgres included, so a plan that destroys anything is stopped
  and read.
- **Every apply redeploys the service from `main`.**
- **Trying a branch before it merges:** `railway up -s treenivihko` uploads
  the working tree. If the upload changes only files outside the watch paths,
  Railway skips it; redeploy it from the dashboard, which ignores them. The
  next deploy of `main` replaces it.
- **A deploy that waits for CI and CI fails** is skipped, and the previous
  version keeps serving. Rerun the failed job; if Railway has not deployed by
  the time it passes, redeploy that commit.

---

## Done when

- [ ] `railway config plan` reports the configuration up to date
- [ ] `/api/health` answers `ok`, with the database `ok`
- [ ] `railway tcp-proxy list -s Postgres` finds none
- [ ] A merge to `main` deploys once CI has passed

## Next

→ `011`, sign-in, once it is written.
