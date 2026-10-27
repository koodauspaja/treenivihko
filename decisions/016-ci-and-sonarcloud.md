# 016 — CI and SonarCloud

## Context

`npm run verify` ran only on the author's machine, and `main`'s one required
check was Sourcery's, which GitHub counts as passed when it skips. Nothing
mechanical held a pull request to the tests or to 100% coverage.

## Decision

- **One workflow, three jobs**, required on `main` beside `Sourcery review`:
  - `Lint, types and unit tests`: lint, the type check, and the unit tests at
    100% with `coverage-gaps`. It uploads `coverage/lcov.info`.
  - `Build and end-to-end`: the production build and the smoke test.
  - `SonarCloud scan`: the analysis with the unit job's coverage, waiting for
    the quality gate so a failed gate fails the check.
- **Node from `.nvmrc`, then npm 12.2.1**, exact and without install scripts,
  because Node 24's bundled npm is older and `.npmrc`'s `engine-strict`
  refuses it. No `npx`: a tool runs as an npm script, from the locked
  dependencies, never fetched on demand.
- **`npm ci --ignore-scripts` in CI.** An install script is how a compromised
  dependency runs code on a runner that holds the repository's tokens. Locally
  npm 12's `allowScripts` decides.
- **Every action pinned to a commit SHA**, with its version in a comment. A tag
  can be moved to other code; a SHA cannot. Renovate will update the pins.
- **Jobs fail, rather than skip, for anyone but the actors in setup 001's
  variables and Renovate.** GitHub counts a skipped required check as passed,
  so a skip would let such a pull request merge; a failure stops it at once.
- **No dependency is installed in the SonarCloud job**, which holds
  `SONAR_TOKEN`. Node 24 runs `scripts/sonar-gate.ts` itself, stripping its
  types, so only this repository's own code runs beside the token.
- **Zero, not Sonar's defaults.** The free plan's only gate is the built-in
  **Sonar way**, which allows 80% coverage and 3% duplication on new code, and
  custom gates need a paid plan. `scripts/sonar-gate.ts` reads SonarCloud's
  measures after the scan and fails a pull request with any new issue,
  duplicated line or security hotspot, and a push to `main` with any open
  issue or hotspot at all. Duplication is counted in lines, because Sonar
  rounds the density to 0.0. A measure missing from the answer fails, except a
  duplicated-line count Sonar leaves out when it has measured no new lines.
  The parser is tested against an answer recorded from SonarCloud: new-code
  values come in a `periods` list, which a guessed shape had missed.
  Coverage is held at 100% by the unit job.
- **Sonar way comprehensive** for every language the project has, as in the
  earlier project, for more rules than the default profile.
- **Tests are analysed as tests**: `sonar.tests` indexes them with Sonar's
  test rules, and `sonar.exclusions` keeps them out of the main sources,
  which with `sonar.sources=.` would otherwise index them twice and abort the
  scan.
- **A false positive is ignored narrowly, with its reason in the repository**:
  that rule, in the files named, in `sonar-project.properties`. A security
  rule is never ignored by file; what it flags is removed instead.
- **Sonar's coverage exclusions are checked against Vitest's.** Vitest reads
  `scripts/coverage-plan.ts`, and Sonar reads `sonar-project.properties`, which
  cannot import code. A unit test fails when the two disagree, when Sonar's list
  names a file that does not exist, or when a configuration file at the root is
  missing from it.

## Why

- A required check that runs the tests makes the gate mechanical where it can
  be. Sourcery's gate stays the author's, because its skips count as passes.
- Three jobs rather than one, so a failure says which kind it is, and the
  end-to-end job's browser install does not slow the unit job.
- Sonar's coverage reuses the unit job's report rather than running the tests
  again, so the coverage Sonar sees is the coverage that passed.
- The earlier project found 17 open issues on `main` with its gate green:
  Sonar had added rules, and they landed on lines too old to be new code. The
  check on `main` turns such a rule into a failure the day it arrives.

## Consequences

- Renaming a job blocks every merge until the ruleset names the new check.
- A rule Sonar adds can fail `main`'s push with no change of ours; it is fixed
  or ignored as above, in a chore of its own.
- A pull request from anyone outside the variables fails CI. Fork pull
  requests need approval to run at all (setup 001), and get no secrets, so
  this repository's own branches are the only way in.
