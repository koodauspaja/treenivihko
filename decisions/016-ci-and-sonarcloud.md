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
- **Node from `.nvmrc`, then npm 12**, because Node 24's bundled npm is older
  and `.npmrc`'s `engine-strict` refuses it.
- **`npm ci --ignore-scripts` in CI.** An install script is how a compromised
  dependency runs code on a runner that holds the repository's tokens. Locally
  npm 12's `allowScripts` decides.
- **Every action pinned to a commit SHA**, with its version in a comment. A tag
  can be moved to other code; a SHA cannot. Renovate will update the pins.
- **Jobs run only for the actors in setup 001's variables and Renovate**, so a
  stranger's pull request spends no Actions minutes or secrets.
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

## Consequences

- Renaming a job blocks every merge until the ruleset names the new check.
- A pull request from anyone outside the variables shows its jobs skipped,
  which GitHub counts as passed; such a pull request needs an owner to look.
