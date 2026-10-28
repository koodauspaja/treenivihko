# 060 — Commit subjects that say what changed

Issue: #60. Adds to `decisions/010-branch-protection.md`, which chose rebase
merges so that each commit lands on `main` with its own message.

## Context

Rebase keeps every commit's subject on `main` as it was written, and Railway
names each deploy by the commit at `main`'s head. Four subjects from #55
reached `main` as "fix: answer the second … fifth Sourcery round on periods
and sessions", so neither `main`'s log nor Railway's deploy list said what
those commits changed, or what was deployed.

The rule against such subjects stood only in `/open-pr`'s commit step. A
review round's fix is committed after that step has run once, and
`CLAUDE.md`, which every session reads, did not say it.

## Decision

- **`CLAUDE.md` holds the rule as a hard rule**, with a good and a bad
  subject taken from `main`.
- **`/self-review` reads the subject of every commit about to be pushed**,
  a round's fix included, so the check runs at each push, not only before
  the first.
- **`/open-pr` and `REVIEW_RULES.md` point to the rule** rather than keep a
  wording of their own.
- **Rebase merges stay.** The subjects already on `main` stay too: its history
  is linear and cannot be force-pushed.

## Why

| Decision | Why |
|---|---|
| A hard rule in `CLAUDE.md`, not only in a skill | A skill's step is read when the skill runs; a round's fix is committed between runs |
| The check in `/self-review` | It runs before every push by its own instructions, which is where a round's commit is made |
| One wording, pointed to | Two wordings drift, and a reader follows whichever they find first |
| No mechanical check on subjects | A pattern can refuse "round" or "Sourcery" but not tell whether a subject says what changed; if the rule is not enough, a check can be its own issue |
| Keep rebase over squash | The owner's call when #60 was filed. With every subject meaningful, rebase's reason in 010 holds, and the deploy list reads |

## Consequences

- **A deploy is still named by one commit**, the last of its pull request, not
  by the pull request. Knowing exactly which pull request is live means
  looking up that commit's pull request.
