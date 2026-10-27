# 008 — Renovate

## Goal

Dependency updates arrive as pull requests on a weekly schedule, and go
through the same checks and the same human merge as any other change. The
configuration arrives with the clone.

---

## Step 1 — Install the app

1. **Once `renovate.json` is on `main`**: <https://github.com/apps/renovate> →
   **Install**, or **Configure** if it is already on your organisation
2. Your organisation → **Only select repositories** → add the repository

Renovate reads its configuration from the default branch. Installed before
`renovate.json` is there, it finds none and opens an onboarding pull request;
close it if it does, since the committed file is the configuration.

## Step 2 — What `renovate.json` does

| Setting | Value | Why |
|---|---|---|
| Schedule | Monday before 07:00, Helsinki | Updates arrive together at the start of the week |
| Limits | 10 open, 5 an hour | A big release day does not flood the board |
| Label | `dependencies` | |
| Minimum release age | 14 days | A compromised release is usually caught and pulled within days, and Renovate's pull requests run CI with the repository's secrets |
| Lockfile maintenance | on | Moves the transitive dependencies `package.json` alone never moves |
| Automerge | off | Every update gets CI, SonarCloud, Sourcery and a human merge |
| `npm@<version>` in `ci.yml` | a custom manager | CI installs an exact npm; Renovate bumps it like a dependency |
| `typescript` | below 7 | Next's plugin and build type check need TypeScript's JS API, which 7 does not ship |
| `@types/node` | below 25 | The types follow the Node line `.nvmrc` names |
| A Node major in `.nvmrc` | waits for approval in the Dependency Dashboard, and only even-numbered lines are proposed | The `@types/node` hold has to move with it, by hand, and `engines` refuses 25 |
| `SonarSource/sonarqube-scan-action` | waits for approval in the Dependency Dashboard | It is the one third-party code that runs beside `SONAR_TOKEN`, so its release is looked at before it runs |

The GitHub Actions pins (`@<sha> # v<version>`) and `.nvmrc` are updated by
Renovate's own managers. `tests/unit/config/renovate.test.ts` checks that the
npm manager's pattern matches every `npm@<version>` in `ci.yml`, and that the
`@types/node` hold follows `.nvmrc`.

**Approving a held update**: open the Dependency Dashboard issue, read the
release (for the scan action, its changes and its commit), then tick its box.
Renovate opens the pull request on its next run.

To check a change to the configuration before pushing it:

```bash
npm exec --yes --ignore-scripts --package=renovate@<version> -- \
  renovate-config-validator renovate.json
```

## Step 3 — What its pull requests get

CI's actor check lets `renovate[bot]` through, beside setup 001's two
usernames, so its pull requests run every check. They have no issue, which
`CLAUDE.md` names as the one exception to its rule. Renovate also opens a
**Dependency Dashboard** issue listing what is pending, held back or failing;
the board's auto-add puts it in `Backlog`, where it stays.

A pull request that changes `package-lock.json` is also scanned for licences
(setup 006); sharp's LGPL libvips is already ignored in Sourcery.

---

## Done when

- [ ] The Renovate app is installed on the repository
- [ ] Renovate's first pull requests arrive, labelled `dependencies`, and CI runs on them

## Next

→ `009`, the database, once it is written.
