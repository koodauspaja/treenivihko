# F006 — Marking a session after training

Spec: `specs/006-session-marks.md`. Issue: #39.

Overrides two earlier records:

- `decisions/031-database-dump.md`, *Consequences*: "The first feature that
  stores the child's data decides backups before it merges, and a restore
  drill comes with whatever it decides." This feature stores the child's
  marks and decides no backups. They are a setup step of their own (#63),
  with no date, and no feature waits for them.
- `decisions/f005-notebook-view.md`, *Decision*: "The page has no forms,
  buttons or inputs, and its one link away from reading is `Valmentaja`, as
  before." The period's page still has no forms, buttons or inputs, but each
  session it may mark links to its marking page, which has a form.

## Context

Back home, the child marks how a session went. Features 007, 008 and 009
read the marks, so they have to be exact, one per session, and never name an
exercise the session did not have when the mark was saved. The child often
marks a day late, sometimes after the next period has started.

## Decision

- **One table, `session_mark`, one row per session**, held by a unique key on
  `session_id`. A save is an upsert, so two first saves at once leave one mark,
  the later one's.
- **The periods the child may mark** are the current one and the latest that
  ended before today (`markableOf` in `src/lib/marks/rules.ts`). The next
  period, before it starts, is not one. Every read and write checks the
  session's period against them, on the day it runs, in Finnish time.
- **A day is from its period's start to today.** The rules refuse a day after
  today; the store refuses one before the start, which only it knows. A day
  after the period's end is taken.
- **A pick names the library exercise**, not the block exercise, with
  `on delete set null`. It stays when the parent moves or removes the exercise
  in the session, and is cleared when the library exercise is deleted.
- **A save refuses a pick that is not in the session now** (`stale`): the
  parent edited the session after the page was loaded, or the request was
  crafted. The page then shows the session's exercises as they are.
- **A pick no longer in the session shows `Ohita`** on the marking page, which
  lists only the session's exercises now; the next save drops it.
- **A save holds its session, its picked exercises and their places in the
  session with `KEY SHARE`**, so a deletion of any of them meanwhile waits for
  it, or commits first and leaves the save `missing` or `stale`.
- **`not_done` keeps nothing but the status**: no day, no face, no picks. The
  database checks it again, as it checks each column's rule.
- **The session's key is `DEFERRABLE INITIALLY IMMEDIATE`** (migration 0007),
  deferred to commit only by deleting a whole account
  (`tests/support/users.ts`, and any future account deletion).
- **The faces are stored 5 for 😄 down to 1 for 😫**, so higher is better for
  whoever reads them.
- **The child's side reads its marks in a snapshot of their own**, beside
  Feature 005's read of the period, not inside it.
- **`En tehnyt` hides the rest of the form on the page**; the hidden fields
  are still sent, and the action keeps nothing of them.
- **Nothing stops the parent from editing a marked session.** A marked session
  is not meant to be edited; the spec leaves it at that.

## Why

| Decision | Why |
|---|---|
| A unique key and an upsert | One mark per session is the spec's; the key holds it under two saves at once, which a read before the insert could not |
| Current and latest ended | The child marks late, and the period that just ended has to stay markable once the next has started; anything older would let a stale address change a mark Features 007 to 009 have already read |
| The start checked in the store | The rules see only the form; the store reads the period anyway to check the session may be marked |
| The library exercise in a pick | Features 007 and 009 ask which exercise was liked, not which place in a block; the same exercise twice in a session is one choice, and a pick survives the parent tidying the session |
| `set null`, not a refusal, on deleting an exercise | A library exercise can be deleted only once no block uses it; refusing it for a mark too would leave the parent no way to delete it but to remove the child's marks |
| A stale pick refused | A mark naming an exercise the session no longer has would tell Feature 009 something that did not happen |
| `KEY SHARE` on the session, the exercises and their places | It conflicts with a deletion, not with an update, so the parent's edits to a session go on while a mark is saved; without it, deleting the session or a picked exercise between the check and the insert ended on the error page, and removing a picked exercise from the session saved a pick the session no longer had |
| The session's key deferred for an account's deletion | Deleting a user cascades to its exercises and to its periods, in trigger order; when the periods go first, clearing a pick updates a mark whose session is gone, and an immediate key refuses it. The integration tests hit it on their first run |
| The faces 5 down to 1 | Sorting and averaging read the right way round with no lookup |
| A snapshot of its own | The period's read is Feature 005's and serves the exercise pages too; the marks join to it by session id, and a write between the two reads shows on the next load |
| The form hiding, the action ignoring | The child sees only what a session not done asks; the server never trusts that the browser hid anything |
| No backups, for now | The parent pays for none and wants no code for them yet; the manual dump before a risky migration stays |

## Not done

- A page loaded just before midnight on the day a period stops being markable
  answers its next save with `Sivua ei löytynyt.`; loading the child's side
  again shows what may be marked.
- Two saves of the same mark from two tabs: the later wins, as in Features 002
  and 004.
- A mark made between the child's side's two reads shows on the next load.
- A save reads its period's dates unlocked, so the parent moving them at the
  same moment is the same as moving them just after: the mark keeps its day,
  as the spec has it for a move after the mark.
- The parent seeing the marks: Feature 007.
- Backups: #63.
