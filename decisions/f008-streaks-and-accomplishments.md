# F008 — Streaks and accomplishments

Spec: `specs/008-streaks-and-accomplishments.md`. Issue: #43.

Overrides one line of `decisions/f007-progress.md`, *Decision*: "It reads
only, and has no way to mark". `Omat treenit` still has no way to mark, but
its load, and the child's side's, records the accomplishments the child has
earned. `specs/005-notebook-view.md` and `specs/007-progress.md` say so where
they said the child's side writes marks and nothing else.

## Context

The child trains on their own schedule, 1 to 4 weeks a period, and marks
sessions late. Something to chase has to survive a rest day, a gap between
periods the parent did not fill in time, and an injury, an illness or a
holiday. An accomplishment the child has seen should never disappear because
a mark was corrected.

## Decision

- **The streak counts weeks**, Monday to Sunday in Finnish time
  (`streakOf` in `src/lib/streaks/rules.ts`). A week is done with a session
  marked `done` or `partly` on a day in it; neutral when not done but paused
  on any day, touched by no period, or the current one; missed otherwise. The
  streak counts done weeks back from the current one, neutral weeks skipped,
  to the first missed week; the best streak is the longest such run.
- **The streak is worked out on every load**, from the marks, the periods
  and the pauses, and never stored.
- **A pause is its days only**, `starts_on` to `ends_on`, 1 to 182 days,
  never sharing a day with another of the parent's pauses: a check and an
  exclusion in the database (migration 0009), as periods have.
- **Accomplishments are stored, one per parent, kind and key**, and never
  deleted but with the account. `key` is empty for a count or a streak, the
  period's id for a full period, the exercise's id for hard became easy, as a
  plain value with no reference. A full period keeps its period's start and
  weeks, and hard became easy its exercise's name, as they were.
- **Accomplishments are earned on a load** of the child's side or `Omat
  treenit` (`getAchievements` in `src/lib/streaks/store.ts`): the facts are
  read in one read-only snapshot, what is due and not yet earned is inserted
  with `ON CONFLICT DO NOTHING`, and the earned are read back. The day earned
  is that load's day.
- **Streak lengths are earned by the best streak**, not the current one.
- **Hard became easy needs a later day**: the exercise's first day as
  hardest before its last day as easiest.
- **The exclusion is a pause's one overlap check**: the insert is tried, and
  a refusal re-reads the pause it overlapped, to name it, as a period's does;
  it answers `missing` when that pause is gone again, and the page shows
  `Sivua ei löytynyt.` beside the start.
- **The accomplishments' kinds live in `src/lib/streaks/kinds.ts`**, with no
  imports, because the schema reads them and drizzle-kit loads the schema.

## Why

| Decision | Why |
|---|---|
| Weeks, not sessions or days | The parent chose it: a child training alone rests on days of their own choosing, and a session streak would never break by time passing, so a pause would have nothing to keep |
| Neutral when nothing was planned | The parent chose it: a gap between periods is the parent's, not the child's |
| The current week neutral | The parent chose it: the streak cannot break on a Wednesday for a week that can still be saved |
| A week touched by a pause is neutral | The parent chose it: a pause is any days, and a week the child could not fully train is not held against them; a week they did train counts anyway |
| The streak worked out, not stored | It follows every mark, pause and period with nothing to keep in step |
| A pause's days only | The parent chose it: an injury or an illness is health data about a child, and the streak does not need the reason |
| Accomplishments stored | The parent chose to keep them for good; worked out each time, a corrected mark could take one away |
| A plain key, and the name's parts kept | A deleted period or exercise must not take its accomplishment with it, nor leave it with no name to show |
| Earned on a load, not on each write | Besides a mark, a pause added over a missed week, a period deleted or moved, and an unmarked session deleted can each make one due; recording them where the child looks catches every cause with one write, and nothing earned waits for a write that may never come |
| Inserted after the snapshot | In a repeatable-read transaction, a conflict with a row another load committed meanwhile is a serialisation failure; outside it, the unique key makes the second insert wait and then do nothing |
| By the best streak | A pause added afterwards can join two runs; the record is what was reached |
| A later day for hard became easy | A single mark naming one exercise both hardest and easiest says nothing about getting better |
| The exclusion as the one check | A check read before the insert gives the same answer and still needs the exclusion for two adds at once |
| `missing` on a vanished overlap | It is what a period does in the same race; the parent tries again |

## Not done

- Two loads at once both read the facts before either inserts; the unique
  key keeps each accomplishment once, and each load logs only its own.
- A pause and a load at the same moment: the load reads the pauses in its
  snapshot, and the next load sees the pause.
- An accomplishment earned by a fact that is then undone before any load,
  such as a mark saved and removed, is never earned.
- A new accomplishment is shown only on `Omat treenit`: out of the spec's
  scope.
