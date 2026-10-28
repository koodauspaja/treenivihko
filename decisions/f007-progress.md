# F007 — The child's progress

Spec: `specs/007-progress.md`. Issue: #40.

Overrides two lines of `decisions/f005-notebook-view.md`:

- *Why*, on an exercise's page found only within the period shown: "The
  child's side shows no earlier period anywhere". The progress page, on the
  child's side, shows every period that has started, the earlier ones
  included: their sessions and marks, never their blocks or exercises. An
  exercise's page is still found only within the period shown.
- *Decision*: "its one link away from reading is `Valmentaja`, as before",
  which `decisions/f006-session-marks.md` already widened to the marking
  pages. The child's side also links to `Omat treenit`, a page that only
  reads.

## Context

Feature 006 stores a mark per session; nothing showed them but the line on
the child's side, and only for the periods the child may still mark. The
child wants to see what they have done, and the parent what the child
picked. Feature 008 adds streaks, Feature 009 reads the marks for the AI.

## Decision

- **A page of its own, `/omat-treenit`**, served from `src/app/progress`,
  linked from the child's side after the periods and before `Valmentaja`.
  It reads only, and has no way to mark: marking stays where Feature 006
  put it.
- **Every period that has started** (`startedOf` in
  `src/lib/progress/rules.ts`): a start of today or earlier in Finnish
  time, newest first, all of them, with no paging. The next period, before
  it starts, is not one, and neither is a marked period the parent moves to
  start later; its marks come back when it starts.
- **`Tehty ‹n›/‹total›` counts `done` and `partly`** against all of a
  period's sessions, marked or not.
- **The counts are worked out on every read**, from the marks of the
  periods shown (`countPicks`), never stored. A pick counts once for its
  library exercise, wherever the exercise sits now, and under its current
  name; a pick cleared by the exercise's deletion counts for nothing.
- **The exercises' order** (`ranked`): liked best most often first, then
  the most picked in all, then the name in Finnish order.
- **The parent sees the marks on the period's page**, under each session:
  its line, then each set pick by name. A second read beside Feature 004's
  `getPeriod`, `getPeriodMarks`, joins them by session id.
- **One line for a mark everywhere** (`src/components/mark-line.tsx`): the
  child's side, the progress page and the trainer side show it alike.
- **The reads are a store of their own**, `src/lib/progress/store.ts`, each
  in one read-only snapshot, limited to the parent's own periods and
  exercises.

## Why

| Decision | Why |
|---|---|
| A page of its own | The child's side is what the child copies into the notebook; a history of every period under it would push the period down and mix copying with looking back |
| No marking on the page | Only the current and the previous period may be marked; a page of every period with marking on some would have to say why the rest cannot be |
| Periods that have started | The next period has no marks to show, and the child would see sessions they cannot have done |
| All periods, unpaged | One child, 1 to 4 weeks a period: a year holds at most 53 periods of up to 20 sessions each, and the spec asks for all |
| `partly` counted as done | The parent chose it: a session partly done is training done, and the count is there to encourage |
| Counts on every read | They follow every mark saved, changed or removed with nothing to keep in step; the data is small |
| The library exercise, by its current name | Feature 006's pick names the library exercise; the child asks which exercise they liked, not which place in a block |
| Liked best first | The parent chose it: the page leads with what the child enjoys |
| On the period's page | The parent sees a period's marks at once, beside the sessions they set up |
| A second read beside `getPeriod` | `getPeriod` is Feature 004's and serves the period's form too; the marks are the progress's, as Feature 006 read its own beside Feature 005's |
| A store of its own | The marks store reads only the periods the child may mark; the progress reads every started one, and the trainer side any of the parent's |

## Not done

- A mark saved between the period's read and its marks' read on the
  trainer side shows on the next load, as on the child's side.
- Charts, totals over all periods and personal records: out of the spec's
  scope.
