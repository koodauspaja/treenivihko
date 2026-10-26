# 006 — The Next.js project

## Goal

The application runs locally, and `npm run verify` passes. The code arrives
with the clone; this step installs what it runs on.

---

## Step 1 — Node and npm

Node 24.15 or later on the 24 line, or 26 and later, and npm 12 or later.
Node 25 is not supported: jsdom, which the unit tests run in, does not accept
it, and `engines` follows jsdom's range, `^24.15.0 || >=26`. `.nvmrc`
names an exact 24 release that satisfies `engines`. With nvm:

```bash
nvm install    # reads .nvmrc
nvm use
npm install -g npm@12
```

`.npmrc` sets `engine-strict`, so `npm ci` refuses a Node or npm older than
`engines` in `package.json` asks for, rather than installing anyway. Node 24
comes with an older npm, so the upgrade is needed once per Node install.

## Step 2 — Install

```bash
npm ci
npm run test:e2e:browser   # Chromium for Playwright
```

On Linux, Chromium also needs system libraries: `npx playwright install-deps
chromium`, which asks for `sudo`. macOS and Windows need nothing more.

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
| Build and end-to-end | `npm run test:e2e` | the production build fails, or the smoke test fails at phone or desktop width |

It stops at the first failure.

---

## Done when

- [ ] `npm ci` installs without blocked scripts
- [ ] `npm run dev` shows the Finnish home page
- [ ] `npm run verify` passes

## Next

→ `007`, CI and SonarCloud, once it is written.
