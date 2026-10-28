# 069 — The lockfile records Tailwind's bundled wasm dependencies

Issue: #69. Adds to `decisions/020-renovate.md`.

## Context

Renovate's first npm updates, #66 and #67, could not update
`package-lock.json`: npm refused with `EALLOWREMOTE`, and CI's `npm ci` then
failed on the stale lockfile.

Renovate writes the lockfile with `npm install --package-lock-only`, using the
npm 12 that `engines` requires. For a package that declares
`bundleDependencies`, the lockfile lists each bundled package as an
`inBundle` entry. When those entries are missing, the lockfile-only path opens
the package's tarball to find them, and it fetches the tarball by its URL. npm
12 counts a URL as a remote spec, and its default `allow-remote=none` refuses
it, although the URL is the registry's own. This is npm/cli#9800, with a fix
proposed in npm/cli#9819 and not released.

The one such package here is `@tailwindcss/oxide-wasm32-wasi`, an optional
dependency that installs only on wasm32, and the lockfile had none of its six
bundled entries. A normal install on macOS skips the package: with a lockfile,
it keeps the entries already there; without one, it writes the package with
no entries, which is most likely how the lockfile was first written.

## Decision

- **The lockfile was regenerated once with `--allow-remote=all`** on that one
  command, which added the six entries and changed nothing else. It resolved
  no new package, and every `resolved` URL in it is on the registry.
- **`allow-remote` stays at npm's default** everywhere else: `.npmrc`, CI,
  Railway's build and Renovate.
- **Renovate's npm stays at 12**, as `engines` requires.

## Why

| Decision | Why |
|---|---|
| Regenerate once, by hand | With the entries in place, npm has no tarball to open, so Renovate's updates run on npm's defaults |
| No `allow-remote=all` in `.npmrc` | It would let every install in CI and Railway's build fetch any URL, to work around one lockfile step |
| No npm below 12 for Renovate | `engines` requires 12, and the lockfile would be written by a different npm than the one CI installs with |

## Consequences

- **A Tailwind update fails the same way** until npm releases the fix: a new
  `oxide-wasm32-wasi` version comes without its bundled entries, as does any
  new package that bundles its dependencies. Its pull request is fixed on its
  branch, and the lockfile pushed, which Renovate then leaves to the human:
  1. `npm install --package-lock-only --ignore-scripts` fails with
     `EALLOWREMOTE`, naming the tarball it refused. Go on only if that is a
     `https://registry.npmjs.org/` URL.
  2. `npm cache add <package>@<version>`, for the package that URL names, puts
     the tarball in npm's cache through the registry.
  3. `npm install --package-lock-only --ignore-scripts --allow-remote=all --offline`
     writes the lockfile from the cache alone. A URL that is not there fails
     with `ENOTCACHED` instead of being fetched, so `--allow-remote=all`
     reaches no host. A failure on another `https://registry.npmjs.org/` URL
     is one step 1 had not reached: step 2 for its package, then step 3
     again. A failure on any other URL stops the repair.
- **Deleting the lockfile and installing again, on macOS, drops the entries**,
  and the next Renovate pull request is red with `EALLOWREMOTE`. The same
  steps put them back, and fix lockfile maintenance if it fails this way.
- **Once npm ships the fix**, Renovate's npm, which follows `engines`, picks it
  up, and none of this needs doing.
