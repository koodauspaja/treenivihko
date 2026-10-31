# F009 — A period adapted to the marks

Spec: `specs/009-adapted-period.md`. Issue: #41.

## Context

Feature 004 makes a new period as a copy of the latest; Feature 006 stores
how each session went. The plan was for the Claude API to build the next
period from the library and the marks, which `decisions/f002-exercise-library.md`,
`decisions/f003-exercise-import.md` and `decisions/f007-progress.md` call
Feature 009; those lines now mean a later feature. That plan's estimated
cost was a few dollars a month, with a key to keep, a prompt and an answer to check, and
the child's marks sent to Anthropic. The parent chose fixed rules first; an
AI-built period can be a later feature.

## Decision

- **A choice on Feature 004's new period**, `Sovita edellisen jakson
  merkintöihin`, offered when the latest period has a mark, checked by
  default. Unchecked, the copy is Feature 004's, unchanged.
- **The rules are a pure function**, `adaptationOf` in
  `src/lib/periods/adapt.ts`: the latest period's sessions, their marks and
  the library in; for each block exercise a replacement, and the list of
  changes, out. The store reads them and copies with the replacements in the
  same transaction as Feature 004's copy, in one snapshot
  (`createAdaptedPeriod`).
- **A session's direction** comes from its mark alone: `done` with 😄 or 🙂
  up, with 😐 or no feeling none, anything else down.
- **An amount steps 20%**, rounded to a whole count or 5 seconds, by at
  least one of those, between half and double the library's default and
  within Feature 002's rule, and never against the direction.
- **The picks decide per exercise**, in the order liked best, hardest, liked
  least, easiest, the first that names it winning. A swap takes an exercise
  sharing a skill label, at the level asked, fitting the session and not in
  it, one not in the latest period first, then by Finnish name.
- **What changed is shown once**, in the action's answer in place of the
  form, and never stored.

## Why

| Decision | Why |
|---|---|
| Rules, not the API | Free, nothing leaves the app, and the same marks always give the same period, so every rule has a test; the parent chose it over the AI's variety |
| A choice on the new period, not a page | It is Feature 004's copy with one more step; a page of its own would repeat the dates' form |
| Half to double the library default | Each period steps from the last; without a bound, a year of good weeks would take an amount past anything the parent meant |
| Never against the direction | An amount the parent set by hand outside the bounds would otherwise go down after a good session |
| Liked best before hardest | An exercise the child likes most is kept, whatever else it was picked as; the hardest one still gets easier |
| A fresh exercise first, then by name | The child sees something new, and the result does not depend on the order rows come back in |
| The change list unstored | It describes one moment; after it, the period's page shows what the period holds |

## Consequences

- **Sessions do not get longer or shorter.** Each keeps its exercises'
  count and its target; a later feature may add or remove exercises.
- **An exercise swapped in starts at its library default**, whatever the
  amount of the one it replaces.
- **The marks read are the latest period's only**; a session left unmarked
  is copied as it is.
- **An AI-built period**, if it comes, is a feature of its own, which may
  use these rules' bounds for the AI's amounts.
