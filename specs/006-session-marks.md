# 006 — Marking a session after training

Issue: #39

## Summary

Back home after training, the child marks a session: whether it was done in
full, in part or not at all, the day it was done, one emoji for how it felt,
and which of its exercises was liked best, liked least, easiest and hardest,
each skippable. The marks are what Features 007, 008 and 009 build on.

## Scope

**In**

- Marking a session of the current period, or of the period before it, on the
  child's side: its status, its day, an emoji and four picks.
- Changing a mark, and removing it.
- Each session's mark shown on the child's side.

**Out**

- Marks per block, or a score per exercise.
- The parent seeing the marks: Feature 007 shows them first.
- Showing progress over sessions: Feature 007.
- Streaks and accomplishments: Feature 008.
- Using the marks to build a period: Feature 009.
- Backups of the database: a setup step of their own, with no date, and not
  a condition of this feature. The manual dump before a risky migration
  stays as it is (`docs/setup/010-railway.md`, *Later*). Feature 006's
  decision record overrides the consequence in
  `decisions/031-database-dump.md` that the first feature storing the
  child's data decides backups, and `docs/infrastructure.md` and setup 010
  stop tying backups to it.
- Stopping the parent from editing a marked session: a marked session is not
  meant to be edited, and nothing enforces it.

## Who and where

The child, at home on the wifi-only device, after training, on the child's
side: signed in with the parent's account, with no unlock (Feature 001).
Nothing here is needed at the field. It builds on Feature 005's page, which
merges first.

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English. Dates
and spans are shown as in Feature 004: `3.11.2026`, `3.11.–16.11.2026`.

**The markable periods** are the current period, and the latest period that
ended before today. With no current period, only the latest ended one is.
The next period, before it starts, is not markable.

**The child's side**, at `/`, gains on Feature 005's page:

| Where | Text |
|---|---|
| Under each session's `‹Paikka› · ‹target› min`, when the period is markable and the session marked | `Tehty ‹date›`, `Osittain ‹date›` or `Ei tehty`, followed by its emoji when it has one: `Tehty 3.11.2026 😄` |
| Then, when the period is markable | `Merkitse` as a link to the session's marking page, or `Muuta` when it is marked |
| After the period, when the latest ended period is markable and is not the one shown | heading `Edellinen jakso ‹span›`, and each of its sessions in order: `Treeni ‹n›`, its mark's line when it has one, and `Merkitse` or `Muuta` |
| The previous period with no sessions | `Jaksossa ei ole vielä treenejä.` under its heading |

The previous period shows only its sessions, not their blocks: it is there to
be marked, not copied. A period shown with `Alkaa ‹date›.`, the next one, has
no `Merkitse`.

**Marking a session**, at `/treeni/‹session id›`, one page:

| Where | Text |
|---|---|
| Heading | `Treeni ‹n›`, and under it `Jakso ‹span›` |
| Status | `Teitkö treenin?`, a choice of `Tein kaiken`, `Tein osan`, `En tehnyt`; none chosen on a first mark |
| Day | `Milloin?`, a date, filled with today on a first mark |
| Emoji | `Miltä treeni tuntui?`, a choice of 😄 🙂 😐 🙁 😫 and `Ohita`, `Ohita` chosen on a first mark. Each face's name for a screen reader: `Tosi hyvä`, `Hyvä`, `Ihan ok`, `Huono`, `Tosi huono` |
| Picks | `Mikä oli kivoin?`, `Mikä oli tylsin?`, `Mikä oli helpoin?`, `Mikä oli vaikein?`, each a choice of the session's exercises and `Ohita`, `Ohita` chosen on a first mark |
| Each pick's exercises | the session's exercises by name, in the session's order, an exercise that appears twice listed once at its first place |
| A session with no exercises | no picks |
| With `En tehnyt` chosen | the day, the emoji and the picks are hidden |
| Button | `Tallenna`, then the child's side |
| Button, when the session is marked | `Poista merkintä`, which asks `Poistetaanko merkintä?` with `Poista` and `Peruuta`; then the child's side |
| Link back | `Takaisin`, to the child's side |

A marked session's page opens with its saved mark chosen. Saving replaces the
mark. The same exercise may be both liked best and liked least, or both
easiest and hardest.

**Refusals**, each beside its field, with nothing saved:

| Case | Text |
|---|---|
| No status | `Valitse, teitkö treenin.` |
| No day, or not a date, with `Tein kaiken` or `Tein osan` | `Valitse päivä.` |
| A day before the period's start, or after today | `Valitse päivä jakson alusta tähän päivään.` |
| A pick that is not among the session's exercises, as when the parent edited the session meanwhile | `Treeni on muuttunut. Valitse uudelleen.`, beside the picks, with the page showing the session's exercises now |

## Data

| Table | Columns | Why |
|---|---|---|
| `session_mark` | `id`; `session_id`, references `training_session`, deleted with it, unique; `status`, `done`, `partly` or `not_done`; `trained_on`, date; `feeling`, integer 1–5; `liked_best_exercise_id`, `liked_least_exercise_id`, `easiest_exercise_id`, `hardest_exercise_id`, each references `exercise`, set to null when it is deleted; `created_at`; `updated_at` | One session's mark |

- **One mark per session**, which the unique key holds.
- **`feeling`** is 5 for 😄, down to 1 for 😫; null when skipped.
- **With `not_done`**, `trained_on`, `feeling` and the picks are all null.
  Otherwise `trained_on` is set. Saving `not_done` over a mark clears them.
  These are checks in the database too.
- **A pick names the library exercise**, not its place in a block, so it
  stays when the parent moves or removes the exercise in the session, and a
  library exercise can be deleted as before, clearing the pick.
- **A copied period** (Feature 004) copies no marks.

**Personal data**: a mark says how a session went and how it felt to the
child. It names no one, and is reached through the parent's own periods. It
is kept because Features 007, 008 and 009 read it; a free-text note is not
stored.

## AI

Not used. Feature 009 reads the marks.

## Edge cases

| Case | Behaviour |
|---|---|
| A session marked out of order, 3 before 2 | Allowed |
| A session of the previous period, marked after the next period started | Allowed, on the previous period's list, with a day from its start to today |
| A period that stops being markable, as when a third period starts | Its marks stay; its marking pages show `Sivua ei löytynyt.` |
| A marking page of the next period, before it starts, or of an earlier period | `Sivua ei löytynyt.` |
| A session of another parent's | `Sivua ei löytynyt.` |
| A day after the period's end | Allowed, up to today: the child may train late |
| Changing a mark to `En tehnyt` | The day, emoji and picks are cleared |
| The parent removes a picked exercise from the session | The pick stays; on the marking page it shows `Ohita` chosen, and the next save drops it |
| The parent deletes the library exercise a pick names | Allowed as before, when no block uses it; the pick is cleared |
| The parent deletes a marked session, or its period | Its mark is deleted with it |
| The parent moves a period's dates after its sessions were marked | The marks keep their days |
| The session deleted while its marking page is open | The save, or the removal, shows `Sivua ei löytynyt.` |
| Two saves of the same mark at once | The later one wins |
| Removing a mark that is already gone | The child's side, as after a removal |
| Not signed in | The sign-in page, as now |
| The database unreachable | The existing error page |

## Logging

Ids only: the user's and the session's. Never a status, a day, an emoji or a
pick.

| Event | Level | Line |
|---|---|---|
| A mark saved, new or changed | info | `session mark saved: user ‹id›, session ‹id›` |
| A mark removed | info | `session mark deleted: user ‹id›, session ‹id›` |
| A database failure in either | error | the event's name, `failed`, the ids, and Postgres's reason, as Feature 001 logs them |

## Security and secrets

- **No new environment variables.**
- **Who may do what**: any signed-in browser of the parent's account marks on
  the child's side, with no unlock, as it reads it now. Every read and write
  is limited to the parent's own sessions in a markable period, checked on
  the server, and a pick takes only an exercise of that session.

## Acceptance criteria

- [ ] Each session of the current period shows `Merkitse`, or its mark's line and `Muuta` when marked, such as `Tehty 3.11.2026 😄`
- [ ] The latest ended period shows under `Edellinen jakso ‹span›`, each session with its mark's line and `Merkitse` or `Muuta`
- [ ] The next period, before it starts, shows no `Merkitse`, and its marking page shows `Sivua ei löytynyt.`
- [ ] A session is marked with a status, a day, an emoji and four picks of its exercises, each of the emoji and picks skippable with `Ohita`
- [ ] With `En tehnyt`, the day, emoji and picks are hidden and nothing of them is saved, and the line shows `Ei tehty`
- [ ] A marked session's page opens with its mark, and saving changes it
- [ ] `Poista merkintä` removes the mark after its confirmation, and the session shows `Merkitse` again
- [ ] An exercise twice in a session is listed once in the picks
- [ ] Each refusal in *Refusals* is shown beside its field, and nothing is saved
- [ ] A session of another parent's, and of an earlier period, shows `Sivua ei löytynyt.`
- [ ] Deleting a marked session deletes its mark, and deleting a picked library exercise clears the pick
- [ ] The marking page fits a phone's width without sideways scrolling
- [ ] Every log line in *Logging* is written, with ids only
- [ ] The decision record overrides `decisions/031-database-dump.md`'s consequence on backups, and neither `docs/infrastructure.md` nor setup 010 ties backups to a feature

## Tests

| Level | What |
|---|---|
| Unit | Which periods are markable: a current one with and without a previous, none current with a latest ended and a next, at a period's last day and across midnight in Finnish time; the mark's line for each status, with and without an emoji; the day's rule at the period's start, a day before it, today and tomorrow; `En tehnyt` clearing the rest; the picks' list with an exercise twice; each refusal's message |
| Integration, against Postgres | The table, its checks and deletes; one mark per session, with two concurrent first saves; a save replacing a mark; a deleted session taking its mark; a deleted library exercise clearing a pick; another parent's sessions, and sessions of a period not markable, out of reach; a pick not in the session refused; the log lines |
| End to end | Marking a session of the current period with every field, and seeing its line; changing it to `En tehnyt`; removing it; marking a session of the previous period; the next period with no `Merkitse` |

## Open questions

None.
