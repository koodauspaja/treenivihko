# 006 — The Next.js project

## Goal

The application runs locally, and `npm run verify` passes. The code arrives
with the clone; this step installs what it runs on.

---

## Step 1 — Node and npm

Node 24 and npm 12 or later. With nvm:

```bash
nvm install    # reads .nvmrc
nvm use
npm install -g npm@12
```

## Step 2 — Install

```bash
npm ci
npm run test:e2e:browser   # Chromium for Playwright
```

npm 12 runs a package's install scripts only when `allowScripts` in
`package.json` approves it. `esbuild` and `fsevents` are approved. If
`npm ci` warns that another package's script was blocked, read what it runs
before approving it with `npm install-scripts approve <package>@<version>`,
which records the approval in `package.json`.

## Step 3 — Run it

```bash
npm run dev        # http://localhost:3000
```

The home page says **Treenivihko** and that the app is being built.

`next dev` writes the Next.js agent rules into `AGENTS.md` and restores them
if removed; `CLAUDE.md` imports that file. Commit `AGENTS.md` if `next dev`
changes it.

## Step 4 — Verify

```bash
npm run verify
```

| Stage | Command | Fails when |
|---|---|---|
| Lint and format | `npm run lint` | Biome finds a problem; `npm run lint:fix` applies the safe fixes |
| Types | `npm run typecheck` | the strict type check fails |
| Unit tests | `npm run test:unit` | a test fails, coverage is under 100% on any metric, or `coverage-gaps` finds a source file missing from the report |
| Build | `npm run build` | the production build fails |
| End-to-end | `npm run test:e2e` | the smoke test fails at phone or desktop width |

It stops at the first failure.

---

## Done when

- [ ] `npm ci` installs without blocked scripts
- [ ] `npm run dev` shows the Finnish home page
- [ ] `npm run verify` passes

## Next

→ `007`, CI and SonarCloud, once it is written.
