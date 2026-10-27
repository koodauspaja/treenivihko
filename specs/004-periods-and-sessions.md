# 004 — Periods and sessions built by hand

Issue: #37

## Summary

The parent builds a period (*jakso*) of training: numbered sessions
(*treeni*), each with a place, the equipment at hand and a target length,
made of blocks (*osio*) of library exercises with their own amounts. A new
period starts as a copy of the latest, so most of the work is adjusting it.

## Scope

**In**

- The period: a start date and a length of 1 to 4 weeks, never overlapping
  another.
- Its sessions, numbered in order, each with a place, its equipment and a
  target length.
- A session's blocks: a theme the parent names, and library exercises in
  order, each with its own amount.
- Picking an exercise from the library, filtered by the session's place and
  equipment, and the session's total length against its target.
- A new period as a copy of the latest; editing and deleting periods,
  sessions, blocks and their exercises.
- Feature 002's deletion of an exercise: refused while a period uses it.

**Out**

- The child seeing a period: Feature 005.
- Marking a session: Feature 006.
- Generating a period with AI: Feature 009.
- Saved blocks to reuse across periods, and moving a session to another
  period.
- Weekdays or rest days: sessions are done in order, whenever the child
  trains.

## Who and where

The parent, at home on wifi, on the trainer side, behind its unlock
(Feature 001). The child never reaches any of it; Feature 005 shows the
child what to copy.

## The period

| Field | Finnish label | Rule |
|---|---|---|
| Start | `Alkaa` | A date |
| Length | `Kesto` | 1, 2, 3 or 4 weeks, shown `1 viikko`, `2 viikkoa` |
| End | — | The start plus the length, less a day: a 2-week period from Monday 3 November ends Sunday 16 November |

- **No two periods overlap**: a period's days may not include a day of
  another's.
- **The current period** is the one whose days include today, in Finnish
  time (`Europe/Helsinki`). There is at most one.
- A period has 0 to 20 sessions. An empty one is allowed while it is being
  built.

## The session

| Field | Finnish label | Rule |
|---|---|---|
| Number | `Treeni ‹n›` | Its place in the period, from 1; deleting one renumbers those after it |
| Place | `Paikka` | Exactly one of Feature 002's places: `Kenttä`, `Sisällä` or `Kuntosali` |
| Equipment at hand | `Välineet käytössä` | Any of Feature 002's equipment; none is allowed |
| Target length | `Tavoitekesto (min)` | Whole minutes, 5 to 120, in steps of 5 |

A session has 0 to 6 blocks.

## The block

| Field | Finnish label | Rule |
|---|---|---|
| Theme | `Osio` | Trimmed, 1–30 characters, counted as Feature 001 counts a nickname: such as `Lämmittely`, `Kuljetus`, `Loppuverryttely` |
| Exercises | — | 0 to 10 library exercises, in order; the same exercise may appear more than once in a session |
| An exercise's amount | `Kertoja` or `Sekuntia` | Starts at the library's amount and kind; the parent may change the number, within Feature 002's rule for that kind. The kind, a count or a time, is the exercise's and is not changed here |

The block keeps its own amount: editing the library's amount later does not
change a block's, and changing a block's never changes the library's.

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English. Every
page below is the trainer side's, behind its unlock. Dates are shown
`3.11.2026`; a period's span is `3.11.–16.11.2026`, or
`29.12.2026–11.1.2027` across a year.

**The menu**, at `/valmentaja`, gains a first link, `Jaksot`, before
`Harjoitteet`.

**The periods**, at `/valmentaja/jaksot`:

| Where | Text |
|---|---|
| Heading | `Jaksot` |
| Link to a new period | `Uusi jakso` |
| Each period, newest first | its span as a link to its page, then `‹n› treeniä`, or `1 treeni`, or `ei treenejä` |
| The current period | `Nyt menossa` after its span |
| No periods | `Jaksoja ei ole vielä.` |
| Link back | `Takaisin`, to the menu |

**A new period**, at `/valmentaja/jaksot/uusi`:

| Where | Text |
|---|---|
| Heading | `Uusi jakso` |
| Start's field | `Alkaa`, a date, filled with the day after the latest period ends, or today when there is none |
| Length's choice | `Kesto`: `1 viikko`, `2 viikkoa`, `3 viikkoa`, `4 viikkoa`, the latest period's length chosen, or 2 weeks when there is none |
| What is copied, when there is a latest period | `Uusi jakso alkaa kopiona jaksosta ‹span›.` |
| When there is none | `Uusi jakso alkaa tyhjänä.` |
| Button | `Luo jakso`, then the new period's page |

The copy takes every session of the latest period, with its place,
equipment and target, every block with its theme, and every exercise with
its amount, in the same order.

**A period**, at `/valmentaja/jaksot/‹id›`:

| Where | Text |
|---|---|
| Heading | `Jakso ‹span›` |
| The current period | `Nyt menossa` under the heading |
| Its dates | `Alkaa` and `Kesto` as on a new period, with `Tallenna`; then `Tallennettu.` |
| Each session | `Treeni ‹n›` as a link to its page, then `‹Paikka›, ‹total› / ‹target› min` |
| No sessions | `Jaksossa ei ole vielä treenejä.` |
| Button that adds a session | `Lisää treeni`, then the new session's page: the place `Kenttä`, every equipment item at hand, a target of 45 minutes, and no blocks |
| Button that deletes the period | `Poista jakso` |
| Its confirmation | `Poistetaanko jakso ‹span› ja sen treenit?`, with `Poista` and `Peruuta`; then the periods' page |
| Link back | `Takaisin`, to the periods |

**A session**, at `/valmentaja/treenit/‹id›`:

| Where | Text |
|---|---|
| Heading | `Treeni ‹n›`, and under it the period's span as a link to it |
| Its settings | `Paikka`, a choice of the three; `Välineet käytössä`, a checkbox each; `Tavoitekesto (min)`; with `Tallenna`; then `Tallennettu.` |
| Its length | `Yhteensä ‹total› min, tavoite ‹target› min`, where the total is the sum of its exercises' library durations; `Yli tavoitteen ‹n› min.` when over it |
| Each block | its theme as a field with `Tallenna`, then its exercises in order |
| Each exercise in a block | its name, as in the library; its amount's field, `Kertoja` or `Sekuntia`, with `Tallenna`; `Ylös` and `Alas` to move it; `Poista` to take it out |
| An exercise that no longer fits | `Ei sovi paikkaan tai välineisiin.` beside it, when the session's place or equipment changed after it was added; it stays until removed |
| A block with no exercises | `Osiossa ei ole vielä harjoitteita.` |
| Button under each block | `Lisää harjoite`, which opens the picker for that block |
| Block's own buttons | `Ylös`, `Alas`, and `Poista osio`, which asks `Poistetaanko osio ‹theme›?` with `Poista` and `Peruuta` |
| Button that adds a block | `Lisää osio`, with a theme field; the new block goes last |
| No blocks | `Treenissä ei ole vielä osioita.` |
| Button that deletes the session | `Poista treeni`, which asks `Poistetaanko treeni ‹n›?` with `Poista` and `Peruuta`; then the period's page |
| Link back | `Takaisin`, to the period |

**The picker**, for one block, at `/valmentaja/treenit/‹id›/lisaa/‹block id›`:

| Where | Text |
|---|---|
| Heading | `Lisää harjoite osioon ‹theme›` |
| What it filters by | `Paikka: ‹Paikka›. Välineet: ‹items›.`, or `Välineet: ei välineitä.` |
| Each exercise that fits | its name, `Taso ‹…›`, its amount and duration, as in the library's list, with `Lisää` |
| None fits | `Yksikään harjoite ei sovi tämän treenin paikkaan ja välineisiin.` |
| After adding | back to the session, with the exercise last in the block |
| Link back | `Takaisin`, to the session |

An exercise fits when it has the session's place, and every equipment item it
needs is at hand: Feature 002's filters with that one place and those items.
The list is in Finnish alphabetical order.

**Refusals**, each beside its field, with nothing saved:

| Case | Text |
|---|---|
| No start date, or not a date | `Anna alkamispäivä.` |
| A length other than 1–4 weeks | `Valitse kesto.` |
| Days that overlap another period | `Jakso menee päällekkäin jakson ‹span› kanssa.` |
| A theme of the wrong length | `Osion nimessä on oltava 1–30 merkkiä.` |
| A target outside 5–120 or not in steps of 5 | `Tavoitekeston on oltava 5–120 minuuttia, 5 minuutin välein.` |
| No place | `Valitse paikka.` |
| An amount outside its kind's rule | Feature 002's: `Kertoja on oltava 1–100.` or `Ajan on oltava 5 s – 10 min, 5 sekunnin välein.` |
| A 21st session | `Jaksossa voi olla enintään 20 treeniä.` |
| A 7th block | `Treenissä voi olla enintään 6 osiota.` |
| An 11th exercise in a block | `Osiossa voi olla enintään 10 harjoitetta.` |

**Deleting a library exercise** (Feature 002's `Poista harjoite`) that a
period uses is refused, on the exercise's page, with
`Harjoite on käytössä jaksoissa: ‹span›, ‹span›. Poista se ensin niiden treeneistä.`
and nothing deleted.

## Data

| Table | Columns | Why |
|---|---|---|
| `period` | `id`; `user_id`, references `user`, deleted with it; `starts_on`, date; `weeks`, integer 1–4; `created_at`; `updated_at` | A period. No two of one parent's overlap, which the database holds too |
| `training_session` | `id`; `period_id`, references `period`, deleted with it; `position`, integer from 1, unique within the period; `place`, a place key; `target_minutes`, integer; `created_at`; `updated_at` | A session in its order |
| `training_session_equipment` | `session_id`, references `training_session`, deleted with it; `label`, an equipment key; primary key both | The equipment at hand |
| `block` | `id`; `session_id`, references `training_session`, deleted with it; `position`, integer from 1, unique within the session; `theme`, text | A block in its order |
| `block_exercise` | `id`; `block_id`, references `block`, deleted with it; `exercise_id`, references `exercise`, never deleted while referenced; `position`, integer from 1, unique within the block; `amount_kind`, `count` or `time`; `amount`, integer | An exercise in a block, with the kind and amount it was given |

`session` is Better Auth's sign-in table, so a training session's is
`training_session`. Each column's own rule is a check in the database too. The rules across rows,
such as the limits on how many there are, are the app's, as in Feature 002.
`block_exercise` keeps the kind it was added with, so a later change of the
library exercise's kind leaves the block's amount meaningful.

**Personal data**: none. A period describes training, not the child.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| A new period whose suggested start overlaps, as when the latest ends in the future and another follows it | The start is the day after the period that ends last; the refusal names any overlap |
| Moving a period's dates onto another's | `Jakso menee päällekkäin jakson ‹span› kanssa.`; nothing saved |
| Two new periods saved at once over the same days | One is saved; the other is refused as overlapping (the database decides) |
| A session's place or equipment changed so an exercise no longer fits | It stays, marked `Ei sovi paikkaan tai välineisiin.`; the parent decides |
| The library exercise's amount changed after it was added to a block | The block keeps its own amount |
| The library exercise's kind changed, count to time | The block keeps its kind and amount, refused by the new kind's rule only when the parent next edits it |
| Deleting a library exercise a period uses | Refused, naming the periods; nothing deleted |
| Deleting the current period | Allowed, after the confirmation; Feature 005 then shows the next period, or none |
| A session, block or exercise of another parent's, by its address | `Sivua ei löytynyt.`; never shown or changed |
| Two saves of the same field at once | The later one wins, as in Feature 002 |
| Moving the first item up, or the last down | Nothing changes; the button is not shown |
| The unlock ends while a page is open | The next save goes to the lock page, as in Feature 001 |
| The database unreachable | The existing error page |

## Logging

Ids only: the user's and the row's. Never a theme.

| Event | Level | Line |
|---|---|---|
| Period created, copied from another | info | `period created: user ‹id›, period ‹id›, from period ‹id›`, or `from none` |
| Period's dates saved | info | `period updated: user ‹id›, period ‹id›` |
| Period deleted | info | `period deleted: user ‹id›, period ‹id›` |
| A refusal for an overlap | info | `period refused, overlap: user ‹id›` |
| Session added, saved, deleted | info | `session created`, `session updated`, `session deleted`, each with `user ‹id›, session ‹id›` |
| Block added, saved, moved, deleted | info | `block created`, `block updated`, `block moved`, `block deleted`, each with `user ‹id›, block ‹id›` |
| An exercise added to a block, its amount saved, moved, removed | info | `block exercise created`, `block exercise updated`, `block exercise moved`, `block exercise deleted`, each with `user ‹id›, block exercise ‹id›` |
| A library exercise's deletion refused while used | info | `exercise refused, in use: user ‹id›, exercise ‹id›` |
| A database failure in any of these | error | the event's name, `failed`, the ids, and Postgres's reason, as Feature 001 logs them |

## Security and secrets

- **No new environment variables.**
- **Who may do what**: only the unlocked trainer side, checked on the server
  for every page and action (Feature 001's `requireTrainer`). Every read and
  write is limited to the parent's own periods, and a block takes only the
  parent's own library exercises.

## Acceptance criteria

- [ ] The menu shows `Jaksot` first, leading to the periods, newest first, with the current one marked `Nyt menossa`, and its empty message
- [ ] A first period is created empty, from today for 2 weeks by default, saying `Uusi jakso alkaa tyhjänä.`
- [ ] A second period starts the day after the first ends, with its length, and is a full copy of it: every session, block, exercise and amount, in order
- [ ] A period's dates are saved, and an overlap with another is refused naming it
- [ ] A session is added with its defaults, its place, equipment and target saved, and its total shown against the target, with `Yli tavoitteen ‹n› min.` when over
- [ ] A block is added, renamed, moved and deleted after its confirmation, and its exercises are added, moved and removed
- [ ] The picker lists exactly the library exercises that fit the session's place and equipment, in Finnish order, and adds one last in its block
- [ ] An exercise's amount in a block is changed within Feature 002's rule for its kind, and the library's amount stays as it was
- [ ] An exercise that no longer fits after a change of place or equipment is marked `Ei sovi paikkaan tai välineisiin.`
- [ ] Deleting a session renumbers those after it, and deleting a period deletes its sessions, after its confirmation
- [ ] Each refusal in *Refusals* is shown beside its field, and nothing is saved
- [ ] Deleting a library exercise a period uses is refused, naming the periods
- [ ] Another parent's period, session or block shows `Sivua ei löytynyt.`
- [ ] Every page here goes to the lock page without an unlock
- [ ] Every log line in *Logging* is written, with ids only

## Tests

| Level | What |
|---|---|
| Unit | A period's end, span and current period, in Finnish time, at a year's turn and across a change to summer time; the length's display; each field's rule at its boundaries (theme 0, 1, 30 and 31 characters; target 0, 5, 7, 120 and 125; an amount at each kind's bounds); a session's total and the over-target message; whether an exercise fits a session; the copy of a period; the counts' limits; each refusal's message |
| Integration, against Postgres | The tables, their checks and deletes; no overlap, with two concurrent saves; positions kept unique while moving and renumbering; a library exercise refused deletion while a block uses it; one parent's rows out of another's reach; the copy in one transaction; the log lines |
| End to end | The menu's `Jaksot`; a first period, a session with two blocks and exercises from the picker, an amount changed, a block moved; a second period copied from it; an overlap refused; deleting a used library exercise refused; deleting a session renumbers |

## Open questions

None.
