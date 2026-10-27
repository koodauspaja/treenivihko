# 020 — Renovate

## Context

Every dependency is pinned exactly, every GitHub Action to a commit SHA, CI
installs an exact npm, and `.nvmrc` names an exact Node. Pins that nobody
moves fall behind without anyone noticing.

## Decision

- **Renovate, weekly**: Monday before 07:00 Helsinki, at most 10 pull requests
  open and 5 an hour, labelled `dependencies`, with lockfile maintenance.
- **Nothing younger than 14 days.** Renovate's pull requests come from
  branches of this repository, so their CI runs hold `SONAR_TOKEN`, and the
  SonarCloud job runs the scan action at whatever pin the pull request names.
  A compromised release, of an action or a package, is usually found and
  pulled within days; waiting two weeks keeps it from being proposed at all.
- **A Node major in `.nvmrc` waits for approval** in the Dependency Dashboard,
  because the `@types/node` hold must move with it, and a test that ties the
  two would fail a pull request that moved only one. Only even-numbered lines
  are proposed, since `engines` refuses 25.
- **Every GitHub Actions update waits for approval too.** `SONAR_TOKEN` is set
  only on the scan step and the gate step, but the job runs `checkout`,
  `setup-node` and `download-artifact` before them on the same runner, where
  any of them could reach what comes later. Fourteen days stops a compromise
  that is found quickly; approval, after reading the release, stops one that is
  not. A release with no timestamp is held rather than taken as old enough.
- **No automerge.** An update is a change like any other: CI, SonarCloud,
  Sourcery and a human merge.
- **No issue for Renovate's pull requests**, the one exception to `CLAUDE.md`'s
  rule. The pull request describes the update; an issue would repeat it.
- **A custom manager for the npm CI installs**, since that version is written
  in a workflow, where no built-in manager looks. A unit test checks the
  pattern against the workflow, so neither can change without the other.
- **TypeScript is held below 7** (`decisions/012-project-init.md`), and
  **`@types/node` below the next Node major**, which a unit test ties to
  `.nvmrc`. Both rules carry their reason in `renovate.json`.

## Why

- A weekly batch is reviewed in one sitting, rather than interrupting the day.
- Holding back by rule, with the reason beside it, is visible in the
  Dependency Dashboard; ignoring a pull request is not.

## Consequences

- Moving to a newer Node line means raising `.nvmrc` and the `@types/node`
  hold together, which the test enforces.
- Lifting the TypeScript hold is a deliberate change, once Next supports
  TypeScript 7.
