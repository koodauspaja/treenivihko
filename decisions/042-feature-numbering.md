# 042 — Features are numbered from 001, apart from their issues

## Context

Every piece of work carried its issue's number, so the first features filed
as a backlog were Feature 034 to 043: the numbers said how many chores and
setup steps came before them, not which feature they were. Setup steps already
had a sequence of their own, their `docs/setup/` document's, with the issue
number left out of the title.

## Decision

- **A feature has its own number**, Feature 001 onwards: one more than the
  highest `Feature NNN` title among all issues, open or closed.
- **Its spec, decision record and branch carry it**: `specs/007-…`,
  `decisions/f007-…` and `feature/007-…`. The issue is linked by
  `Closes #N`, as before.
- **Chores and bugs keep their issue's number**, for their decision record and
  branch.
- **A feature's issue has its number from the start**, so it can wait in
  `Backlog` before its spec is written.

## Why

| Decision | Why |
|---|---|
| A sequence of its own | Feature 007 says it is the seventh feature, whatever was filed in between |
| The `f` on a feature's record | Records numbered by issue already hold 006 to 042; a seventh feature's `007` would sit among them as if it were issue 7 |
| The next number from the issue titles | The titles are the one list every feature is in, a spec or not; no counter to keep |
| Chores and bugs unchanged | Their issue is the only thing that has to lead to the record and the branch |

## Consequences

- **Sourcery's Block 3**, which pairs a spec with its decision record, names
  the feature number; setup 004 has the text, and the rule in Sourcery's
  dashboard is changed to match.
- **The backlog is renamed** after the merge: issues #34 to #41 and #43 become
  Feature 001 onwards, in their order.
