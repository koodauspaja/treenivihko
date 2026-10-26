# 010 — Protecting `main`

## Context

Until now nothing technical stopped a change reaching `main` without a pull
request, and the Sourcery gate was the author's alone. One person works here,
so a required approval is impossible: GitHub does not let an author approve
their own pull request.

## Decision

- **A ruleset on the default branch**: a pull request with 0 approvals,
  `Sourcery review` as a required check from Sourcery's app with the branch up
  to date, conversations resolved, linear history, no force-push and no
  deletion. Nobody is on the bypass list.
- **Rebase merges.** Each commit lands with its own message, and `main` takes
  no merge commits. Squash is allowed for a branch whose commits are not worth
  keeping, when a human asks for it.
- **A stale branch is rebased**, not merged with `main`, and force-pushed with
  a lease.
- **Overrides `decisions/006-sourcery-review.md` on one point:** a head with a
  `success` check and no review passes the gate when every commit since the
  last full review is low risk. 006 said a green check alone never passes.
  Sourcery answers some small pushes with the check and no review (#9), and
  under 006 each of them cost a full round for a commit the risk levels call
  low. A green check still never passes on its own after a high-risk commit,
  or with no full review before it.

## Why

- The ruleset makes the human merge the only way in, and the required check
  catches a Sourcery failure. It cannot catch a skip, which GitHub counts as
  passed, so the gate in `/open-pr` still reads the review itself.
- Rebase keeps the commits worded as they were written, which a squash would
  fold into one.

## Consequences

- A required check that stops reporting blocks every merge until the ruleset
  names its replacement. Adding CI and SonarCloud adds their checks here.
- Every branch that falls behind needs a rebase and a force-push, which gives
  it a new head for Sourcery to answer.
