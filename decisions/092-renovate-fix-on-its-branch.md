# 092 — A Renovate pull request's fix goes on its own branch

Issue: #92. Adds to `decisions/020-renovate.md`.

## Context

`decisions/020-renovate.md` makes Renovate's pull requests the one change with
no issue. An update sometimes needs a change of ours to pass: the npm bump
from 12.2.1 to 12.2.2 updated `ci.yml` and `.railway/railway.ts`, as the
custom manager is meant to, but a unit test wrote the old version out as a
literal, and Renovate does not update tests. Under the rule as it stood, that
fix needed an issue, a go, a card, a branch and a pull request of its own,
merged before Renovate's could pass.

## Decision

- **The fix is a commit on the Renovate pull request's own branch**, with no
  issue and no card.
- **A human asking Claude to fix that pull request agrees the work and starts
  it.** A human still merges it, as every Renovate pull request.
- **The fix holds only what the update needs to pass.** Anything beyond it,
  such as a change worth having apart from this update, is a chore with its
  own issue.
- **Its checks are those of any change of ours**, by `/open-pr`: `/self-review`,
  the `code-review` skill and `npm run verify` before the push, then the pull
  request's CI.
- **Sourcery reviews a high-risk fix only**, rated by `/open-pr`'s risk table:
  code adapting to a breaking update gets a full review before the handoff; a
  low-risk fix, such as a test or a config value, gets none, as Renovate's
  update itself gets none.
- **A decision record, when one is due, takes the pull request's number**,
  as a chore's takes its issue's.

## Why

| Decision | Why |
|---|---|
| On Renovate's branch | The update and what it needs arrive in one pull request, and one merge, instead of two that must land in order |
| No issue | The pull request already says what changes and why; an issue for its fix would repeat it, as `decisions/020-renovate.md` found for the update itself |
| The request is the go and the start | There is nothing else to agree: the update is Renovate's, and the fix is whatever makes it pass |
| Sourcery for a high-risk fix only | A low-risk fix is a few lines that Claude's own reviews, CI and the human's merge already read, and a review round would hold up a weekly update for them; code that adapts the app to a breaking update is code like any other |
| Only what the update needs | A fix with no issue has no criteria to hold it, so it stays small enough to read in the pull request |

## Consequences

- Renovate stops all updates of a branch once someone else has pushed to it:
  it no longer rebases it on `main` or moves it to a newer release. Asking it
  to rebase, with the box in its pull request or the `rebase` label,
  regenerates its commit for the branch, which drops the fix.
- The fix is a new commit, never an amendment of Renovate's, which Renovate
  would rebase over.
- A fixed Renovate branch that falls behind `main` is rebased by hand.
