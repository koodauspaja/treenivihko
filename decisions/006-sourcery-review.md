# 006 — Sourcery review and its merge gate

## Context

Every pull request is reviewed by Sourcery before a human merges it. The
review should be lighter than a project with a long incident history needs,
but must not let a change merge on a review that never happened.

## Decision

- **Three rule blocks**: secrets and real people's data; Finnish UI and AI
  output checked against the exercise library; a decision record agreeing with
  its spec. They are what matters most here and what no deterministic check
  can reach. Tests, English and the comment shape are left to tooling and
  `CLAUDE.md`. The reasons per block are in `REVIEW_RULES.md`.
- **The repository has its own Sourcery settings**, not the organisation's,
  with the lockfile filtered out of the reviewed diff so that it does not spend
  the Open Source plan's size limits.
- **The gate reads the review, not the check.** A pull request passes on a
  full review of its head by Sourcery's app account, recognised by the first
  line of the review's body. A green check alone, a skip, or a dismissed
  review does not pass.
- **Fixes after the first review carry a risk level**, decided by Claude and
  stated on the pull request. A low-risk commit passes on Sourcery's quick
  check. A high-risk one gets a fresh full review: business logic, data
  writes, access, migrations, secrets or personal data, or a big UI change.
  In doubt, it is high.
- **At most three full reviews per pull request.** Every finding of a round is
  fixed in one commit. After the third, what is left is answered in its
  thread and the pull request goes to the human.

## Why

- A strict gate, with a full review after every non-documentation fix, costs
  a round of waiting each time. A loose one, with a full review only on
  opening, lets a changed rule of the business logic merge unreviewed. Risk
  levels put the full reviews where a reviewer would look.
- The round limit keeps a pull request from looping on findings that each fix
  produces. The human reads what remains.
- Sourcery's own check goes green when it skips, so the check cannot be the
  gate.

## Consequences

- The risk level is a judgement, so it is written on the pull request where
  the human can disagree with it.
- Block 2's paths assume the app's code is under `src/`; the Next.js setup
  keeps it there.
