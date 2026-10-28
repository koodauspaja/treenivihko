# 056 — Telling Sourcery that a request sent again is the parent's own

Issue: #56. Adds to `decisions/050-sourcery-calibration.md`, which told
Sourcery how the app is used.

## Context

050 counted "a retry after a lost answer" among the kinds of finding answered
without a change, beside two requests at the same instant. Block 4's words,
though, named only the second: "two of their requests at the same instant are
rare". A request sent again after a lost answer is not at the same instant, so
the rule did not cover it.

#55, Feature 004, is the first pull request with adds and moves of rows the
parent orders. Each finding is sorted by how its thread was settled, as in
050.

## The measurement

| Round | Findings | Led to a fix | Answered, no change |
|---|---|---|---|
| 1 | 6 | 2 | 4 |
| 2 | 5 | 3 | 2 |
| 3 | 10 | 6 | 4 |
| 4 | 5 | 3 | 2 |
| 5 | 5 | 3 | 2 |
| 6 | 2 | 0 | 2 |
| **All** | **33** | **17** | **16** |

Of the 16 answered without a change:

| Kind | Count | Rounds |
|---|---|---|
| A request the parent sends again: a repeated add makes a second row, a repeated move moves again | 6 | 1, 2, 3, 5 (twice), 6 |
| The older version, during a rollout or after a rollback, meeting the new foreign key on an exercise's deletion | 4 | 1, 3, 4, 6 |
| Not a bug, shown so in the thread | 2 | 2, 4 |
| One-off judgements | 4 | 1, 3 |

**The first kind is the one Block 4 meant to say and did not.** It came back
in five of the six reviews, each time Medium. One of the one-off judgements,
the day after 31.12.9999, was answered in round 1 and fixed when it came back
in round 3.

## Decision

- **Block 4 says a request the parent sends again, by a second click or after
  a lost answer, is theirs too**: nothing resends a server action on its own.
  That such a request, an add or a move, applies a second time is not
  reported when its result shows on the page, one action undoes the extra
  time and no data is lost.
- **One that loses data, leaves it half saved, or whose result cannot be seen
  is still reported**, as a race between two requests at once is.
- **The text is in `docs/setup/004-sourcery-setup.md`**, the one copy pasted
  into the dashboard, and `REVIEW_RULES.md` says why.
- **The older version's exercise deletion meeting the new key is left as it
  is.** On #55 the deploy order showed it cannot happen during a rollout,
  only after a rollback past the feature, which is rare; and it is not the
  same kind of finding.

## Why

| Decision | Why |
|---|---|
| Say it in Block 4, not guard the writes | Keying requests by an id the form makes brought back deleted rows and overwrote later edits in Feature 002 (`decisions/f002-exercise-library.md`). Guarding by the position or count a form saw would change what a second tab shows, which is a product decision, for a repeat whose result is already in plain sight |
| The same test as a race: lost, half saved or unseen | A repeat that loses data is worth a finding whoever sends it; one the parent sees and undoes with one click is not |
| Say what one action undoes: the extra time | A move swaps a row with its neighbour from where it is now, so a move made twice shifts it two places, and one move back leaves it one place from where it started, where the parent meant it. Sourcery's first review of this rule read "one action undoes it" as undoing both moves and asked for the one-click reason to go. Its second read "puts a row moved twice where the parent meant it" as back where the row started. Block 4 now names the extra time and says nothing of positions |
| Name the server action, not the buttons | Neither the browser nor Next.js sends an action again, so a repeat is always the parent's click. The add buttons are disabled while their request runs, but the move and remove buttons are not, so a double-click can repeat a move; it shows at once and one click undoes the extra time. The rule rests on what holds for every button |

## Consequences

- **The change does nothing until the owner pastes Block 4 into Sourcery's
  dashboard.** The pull request that merges this cannot show it.
- **If a page ever sends a request on its own**, such as a retry, a sync in
  the background or an offline queue, the repeat is no longer the parent's,
  and Block 4 must be rewritten first.
- **To measure again**, after the next pull request with adds or moves: check
  that the repeated request is gone from its findings, and that a repeat
  which loses data would still be reported.
