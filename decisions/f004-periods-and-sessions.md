# F004 — Periods and sessions built by hand

Spec: `specs/004-periods-and-sessions.md`. Issue: #37.

Settles what `decisions/f002-exercise-library.md` left to this feature:
deleting a library exercise is refused while a block uses it.

## Context

The parent plans a period of training: sessions done in order, each made of
blocks of library exercises. The child copies it into a notebook (Feature
005), and later periods are adapted from the marks (Features 006 and 009),
so its shape has to be exact and stay consistent under two tabs saving at
once. Most periods look like the one before, so a new one starts as a copy.

## Decision

- **Five tables**: `period`, `training_session`, `training_session_equipment`,
  `block` and `block_exercise`. `session` is Better Auth's, hence
  `training_session`.
- **No two of a parent's periods overlap, held by the database**: an
  exclusion over `daterange(starts_on, starts_on + 7 * weeks)`, with
  `btree_gist` for the user's id, in the custom migration 0004. The app checks
  first, to name the period in the refusal; the exclusion decides two saves
  at once, and its refusal (23P01) is told as the period found afterwards.
- **Positions unique within their parent, checked at commit**
  (`DEFERRABLE INITIALLY DEFERRED`), so a move swaps two positions in one
  transaction, and deleting renumbers those after.
- **Every write to a parent's children locks the parent row first**
  (`FOR UPDATE`), then counts or renumbers, so the limits (20 sessions,
  6 blocks, 10 exercises in a block) and the positions hold under concurrent
  adds.
- **Locks are taken from the period down**: a write that moves or deletes a
  row, and so changes its siblings, reads the row's parent unlocked, locks
  the parent, and only then locks the row.
- **The picker shows only the exercises that fit; the server does not refuse
  one that does not.**
- **A read of several statements runs in one read-only `repeatable read`
  snapshot**, and so does creating a period, whose copy reads the latest
  period in several statements.
- **A block exercise keeps its own kind and amount**, copied from the library
  when added. Its amount is checked by the rule of its own kind.
- **An exercise in a block is refused deletion twice**: the store checks
  `periodsUsing` in the delete's transaction, to name the periods, and the
  foreign key refuses (23503) one added meanwhile.
- **That foreign key is `DEFERRABLE INITIALLY IMMEDIATE`**: immediate for
  every write, deferred to commit only by deleting a whole account
  (`tests/support/users.ts`, and any future account deletion).
- **Today is Finland's** (`Europe/Helsinki`), and days are calendar dates
  (`YYYY-MM-DD`, Postgres `date`), moved in UTC so a change to summer time
  never skips one.
- **A start date is a real day in the years 1 to 9999, and so is the
  period's last day**; anything else is `Anna alkamispäivä.`
- **An id that is not a UUID is no row of anyone's**, refused before any
  query (`src/lib/db/ids.ts`), as Feature 002 did for exercises.
- **A refused field keeps what was typed.** React empties a form after its
  action, so the forms keep the sent values and show them again on a refusal.
- **Otherwise a form shows the page's saved values, newer ones included**: its
  fields are keyed on them as well as on its answer, so a page refreshed after
  a save in another tab shows that save.
- **Saving a period's dates locks the period first**, as every other save
  locks its row, so a deletion meanwhile is not found rather than saved.
- **Adding a block exercise reads its library exercise with a `KEY SHARE`
  lock**, so a deletion of it meanwhile either waits and is refused as in
  use, or commits first and leaves the add not found.
- **No day follows 31.12.9999**, so after a period ending then, a new
  period's form leaves its start empty.

## Why

| Decision | Why |
|---|---|
| The exclusion in the database, the check in the app too | Only the database sees two saves at once; only the app can name the period in Finnish |
| The overlap found again after a 23P01 | The row that refused this one committed after this transaction's read, so only a fresh read finds it; if it is gone again, the refusal still stands, as not found |
| Deferred uniques for positions | Swapping two positions passes through a duplicate, which an immediate unique refuses |
| Locks from the period down | A delete that locked its block before the session, then renumbered the next block, deadlocked with a move of that next block waiting for the session; the integration tests run such neighbours at once |
| Lock the parent before counting | Two adds that each count 19 sessions would both insert a 20th without it; the integration tests run 21 adds at once |
| `repeatable read` for creating a period | The copy reads sessions, equipment, blocks and exercises in turn; at `read committed`, a block deleted between two reads would be copied without its exercises |
| No refusal of an exercise that does not fit | Only a stale picker or a crafted request adds one, and the session page marks it `Ei sovi paikkaan tai välineisiin.`, as it marks one whose session changed after it was added; it is the parent's own plan either way |
| A block exercise's own kind | A later change of the library's kind, count to time, would otherwise make the block's amount mean something else |
| The store's check and the foreign key | The check names the periods; the key holds when a block exercise is added after the check, and its refusal says the same |
| The foreign key deferred only for an account's deletion | Deleting a user cascades to its exercises and to its periods, in trigger order; when the exercises go first, an immediate key refuses the block exercises still pointing at them. Deferred, both cascades finish before it is checked |
| `isNameInUse`'s reading of a deadlock still holds | Adding a block exercise takes only a `KEY SHARE` lock on its exercise. A rename's update takes `NO KEY UPDATE`, which does not conflict with it, because Postgres counts no expression index, such as the name's, as a key; so the library's writes can still deadlock only on the name index (`decisions/f003-exercise-import.md`) |
| Finnish time for today | The child and the parent call the day by Finnish time, wherever the server runs |
| Years 1 to 9999 | Postgres has no year 0, and a last day past 9999 cannot be shown as `D.M.YYYY` |
| A non-UUID id refused before a query | A crafted address can carry U+0000, which Postgres cannot even compare, and would end on the error page rather than as not found |
| Refused values kept in the form | Retyping a 30-character theme to fix one letter is the kind of friction that makes the parent stop planning |
| Forms keyed on the saved values | React leaves a mounted field's value alone when only its default changes, so without the key the older value stayed on screen and the next save sent it back |
| The period and the library exercise locked when read | A read that decides a write has to see the row the write meets: unlocked, a deletion between them made a save of a deleted period say `Tallennettu.`, and an add end on the error page |

## Not done

- Two refusals told imperfectly when a third write lands in between, left as
  they are because each needs the same parent working in two tabs within
  milliseconds:
  - A period refused as overlapping a period deleted right after the refusal
    says `Sivua ei löytynyt.` beside its start, instead of naming a period.
  - An exercise refused deletion by the key, whose block exercise is removed
    right after, names no period in its refusal.

- Saved blocks reused across periods, and moving a session to another period:
  out of the spec's scope.
- A version check on concurrent edits of the same field: the later save wins,
  as in Feature 002 (Feature 010 is filed for the library).
- Two periods created at the same moment from two tabs, with days apart, can
  both copy the same latest period, so the later one misses the other's
  sessions. Nothing is lost, and the copy can be edited; a lock would have to
  be taken before the copy's `repeatable read` snapshot, which a lock inside
  its transaction is not.
- An add sent twice, as when its answer is lost, adds two rows. The second is
  in plain sight and one `Poista` removes it; keying adds by an id the form
  makes brought back deleted rows in Feature 002.
- A rollback past this feature once block exercises exist: the older
  version's exercise deletion meets the new foreign key and shows the error
  page rather than the refusal. Nothing is deleted.
- The picker reads the whole library and filters it in the app, as the
  library page does: it is one parent's curated list.
