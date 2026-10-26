# 012 — The application skeleton

## Context

The app starts here, with no features. What this sets now is hard to change
later: the layout of the code, how strict the type checker is, and how
coverage is held at 100%.

## Decision

- **Next.js 16 on the App Router**, as `create-next-app` makes it, with
  `cacheComponents` and `partialPrefetching` on. Tailwind for styling.
- **Code under `src/`**: `src/app` for routes, `src/components` for UI, and
  `src/lib/<domain>` for everything else, one folder per domain
  (`lib/exercises`, `lib/programs`, `lib/ai`, `lib/auth`) as features arrive.
  No API layer: pages and server actions call `lib` directly. Folders are made
  when their first file is, not in advance.
- **Strict TypeScript**: `strict` plus `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitReturns` and no unused locals or
  parameters.
- **TypeScript stays on 6.x.** Next's TypeScript plugin and the type check in
  `next build` use TypeScript's in-process JS API, which TypeScript 7 does not
  ship. When Renovate is set up, a rule holds `typescript` below 7, to be
  lifted once TypeScript 7 has a stable JS API that Next supports.
- **Biome** for lint and format, with `noExplicitAny`, `noConsole` and
  `noNonNullAssertion` as errors. **Markdown is excluded**: Biome's Markdown
  formatter puts a blank line after the opening `---` of front matter, which
  breaks the skills and the issue templates, and it pads every table.
- **Vitest in two projects**, split by whether a test needs a DOM: a `.ts`
  test runs in Node, a `.tsx` test in jsdom.
- **Coverage is 100% on all four metrics**, over `src/` and `scripts/`.
  Because coverage `include` names the source tree, a file no test imports is
  reported at 0% and fails the thresholds. `scripts/coverage-gaps.ts` is the
  second line: it fails on a source file missing from the report, and on an
  exclusion naming a file that does not exist. Exclusions live in one place,
  `scripts/coverage-plan.ts`, each naming a file, never a directory, with its
  reason.
- **Playwright against a production build**, at a phone's width and a
  desktop's, in Chromium. `npm run test:e2e` builds first and never reuses a
  running server, so it always tests the code as it is.
- **`npm run verify`** runs lint, the type check, the unit tests, then the build
  and the end-to-end tests, stopping at the first failure.
- **Node 24.15 or later and npm 12**, in `engines` and `.nvmrc`, enforced by
  `engine-strict` in `.npmrc`. 24.15 is jsdom's minimum on the 24 line. npm 12
  blocks install scripts until approved; `esbuild` and `fsevents` are, in
  `allowScripts`.
- **sharp's prebuilt libvips is LGPL-3.0.** Next.js depends on sharp, which
  ships libvips as a separate shared library. The app uses it unmodified, on
  the server, and distributes no binary of it, which LGPL-3.0 allows beside
  this project's MIT licence. Sourcery's licence scan flags each libvips
  package as blocking; they are accepted here and ignored in Sourcery.
- **`AGENTS.md` holds the Next.js agent rules** that `next dev` writes and
  restores, and `CLAUDE.md` imports it, so there is one copy.

## Why

- Grouping `lib` by domain from the start keeps a flat folder from growing to
  a hundred files, as the earlier project's did.
- Coverage `include` makes the common case, an untested new file, fail on its
  own. The gaps check catches what the thresholds cannot: a file outside
  `include`, and an exclusion left behind after its file is gone.
- Testing a production build is what will run on Railway; `next dev` differs.

## Consequences

- A new source file needs a test in the same pull request, or an exclusion
  with a reason.
- Biome does not check Markdown, so prose is the author's and the reviewers'.
