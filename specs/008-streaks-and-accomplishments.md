# 008 — Streaks and accomplishments

Issue: #43

## Summary

The child gets things to chase: a streak of weeks with training done, their
best streak as a record to beat, and accomplishments earned from their marks,
with the next goals in sight. The parent sets a pause for an injury, an
illness or a holiday, and a paused week does not break the streak.

## Scope

**In**

- The streak: weeks in a row with a session done, counted on every load.
- The best streak.
- Accomplishments, kept for good once earned: session counts, streak lengths,
  a full period, and an exercise that went from hardest to easiest.
- The next session count and streak length to reach, with progress.
- Pauses on the trainer side: adding and deleting them.
- The streak's line on the child's side, and the streak, the accomplishments
  and the next goals on `Omat treenit`.
- Loading the child's side or `Omat treenit` records what has been earned.
  Feature 008's decision record overrides two lines this changes: "It reads
  only" in `decisions/f007-progress.md`, and "the child's side writes marks
  and nothing else" in `specs/005-notebook-view.md`. That spec, and
  `specs/007-progress.md`'s "never writes", are updated to say so.

**Out**

- Comparing with anyone else, and leaderboards.
- A pause's reason: only its days are stored.
- Limits the AI must respect during a pause, such as "no jumps": Feature 009
  or later.
- Editing a pause in place: it is deleted and added again.
- Telling the child about a new accomplishment anywhere but `Omat treenit`.
- Taking an accomplishment away: once earned, it stays.

## Who and where

The child, at home on the wifi-only device, on the child's side and on
`Omat treenit`, with no unlock (Feature 001). The parent, at home, on the
trainer side behind its unlock, for pauses. Nothing here is needed at the
field.

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English. Dates
and spans are shown as in Feature 004: `3.11.2026`, `3.11.–16.11.2026`; a
one-day pause is its day alone, `3.11.2026`. Weeks are counted `0 viikkoa`,
`1 viikko`, `2 viikkoa`.

### The streak

A **week** runs Monday to Sunday, in Finnish time (`Europe/Helsinki`). Each
week is one of:

| A week is | When |
|---|---|
| **Done** | At least 1 of the parent's sessions is marked `Tein kaiken` or `Tein osan` with its day in the week, whatever period the session is in |
| **Neutral**, when not done | Any of its days is in a pause; or no period covers any of its days; or it is the current week |
| **Missed** | Neither |

- **The streak** is the count of done weeks from the current week back, with
  neutral weeks skipped, up to the first missed week.
- **The best streak** is the longest such run of done weeks ever, with only
  neutral weeks between them. It is never less than the streak.

So the current week cannot break the streak before it ends, and a week the
child trained counts even when part of it is paused.

### The child's side

At `/`, under the greeting and above the period:

| Case | Text |
|---|---|
| The streak is 1 or more | `Putki: ‹weeks›`, such as `Putki: 3 viikkoa` |
| Then, when today is in a pause | `Tauko ‹span›: putki ei katkea.` |
| Or, when the current week is not done | `Tee treeni tällä viikolla, niin putki jatkuu.` |
| The streak is 0, and today is in a pause | `Tauko ‹span›: putki ei katkea.` |
| The streak is 0 otherwise | `Tee treeni tällä viikolla, niin putki alkaa.` |

### Accomplishments

| Kind | Earned when | Its name |
|---|---|---|
| Session counts | The count of sessions marked `Tein kaiken` or `Tein osan`, over all periods, reaches 1, 10, 25, 50 or 100 | `Ensimmäinen treeni`, `10 treeniä`, `25 treeniä`, `50 treeniä`, `100 treeniä` |
| Streak lengths | The best streak reaches 4, 8, 12 or 26 weeks | `4 viikon putki`, `8 viikon putki`, `12 viikon putki`, `26 viikon putki` |
| A full period, once per period | Every session of a period with at least 1 session is marked `Tein kaiken` | `Koko jakso tehty ‹span›` |
| Hard became easy, once per exercise | An exercise is picked as hardest in a mark, and as easiest in a mark whose day is later | `Vaikeasta helpoksi: ‹exercise›` |

An accomplishment is **earned the first time the child's side or `Omat
treenit` is loaded after its condition holds**, and its day is that day. It
is kept for good: changing or removing a mark, a pause or a period never takes
it away, and it never shows twice.

### `Omat treenit`

Feature 007's page gains, after its heading and before its periods:

| Where | Text |
|---|---|
| Section heading | `Putki` |
| Its lines | `Putki nyt: ‹weeks›`, then `Paras putki: ‹weeks›` |
| Section heading | `Saavutukset` |
| Each accomplishment earned, newest first, in the table's order within a day | its name, and under it its day: `Koko jakso tehty 3.11.–16.11.2026`, `5.11.2026` |
| None earned | `Saavutuksia ei ole vielä.` |
| Section heading, when a goal is left | `Seuraavat tavoitteet` |
| The next session count not earned | `‹name› (‹sessions done›/‹goal›)`, such as `10 treeniä (7/10)` |
| The next streak length not earned | `‹name› (‹streak›/‹goal›)`, such as `8 viikon putki (5/8)` |

A goal earned at every step is left out; with both left out, so is the
section.

### Pauses, on the trainer side

**The menu**, at `/valmentaja`, gains `Tauot` after `Jaksot`.

**The pauses**, at `/valmentaja/tauot`:

| Where | Text |
|---|---|
| Heading | `Tauot` |
| Under it | `Tauon aikana putki ei katkea.` |
| Each pause, latest start first | its span, then `Poista`, which asks `Poistetaanko tauko ‹span›?` with `Poista` and `Peruuta` |
| No pauses | `Taukoja ei ole.` |
| The form | `Alkaa`, a date, filled with today; `Päättyy`, a date, filled with 6 days after today |
| Button | `Lisää tauko`; then the list shows the pause |
| Link back | `Takaisin`, to the menu |

**Refusals**, each beside its field, with nothing saved:

| Case | Text |
|---|---|
| No start, or not a date | `Anna alkamispäivä.` |
| No end, or not a date | `Anna päättymispäivä.` |
| An end before the start | `Tauko ei voi päättyä ennen alkuaan.` |
| Longer than 182 days, the start and the end included | `Tauko voi olla enintään 26 viikkoa.` |
| A day shared with another pause | `Tauko menee päällekkäin tauon ‹span› kanssa.` |

A pause may be in the past or the future.

## Data

| Table | Columns | Why |
|---|---|---|
| `pause` | `id`; `user_id`, references `user`, deleted with it; `starts_on`, date; `ends_on`, date; `created_at`; `updated_at` | The days the streak does not break |
| `accomplishment` | `id`; `user_id`, references `user`, deleted with it; `kind`; `key`, text; `earned_on`, date; `period_starts_on`, date; `period_weeks`, integer; `exercise_name`, text; `created_at` | What the child has earned, kept for good |

- **A pause** is 1 to 182 days, `ends_on` not before `starts_on`, in the years
  1 to 9999, and no two of a parent's pauses share a day. These are checks in
  the database too.
- **An accomplishment's `kind`** is one of `sessions_1`, `sessions_10`,
  `sessions_25`, `sessions_50`, `sessions_100`, `streak_4`, `streak_8`,
  `streak_12`, `streak_26`, `full_period`, `hard_to_easy`.
- **Its `key`** is empty for a count or a streak, the period's id for a full
  period, and the exercise's id for hard became easy. It is a plain value, not
  a reference, so the accomplishment stays when the period or the exercise is
  deleted. One per parent, kind and key, which a unique key holds.
- **A full period's** `period_starts_on` and `period_weeks`, and **hard became
  easy's** `exercise_name`, are what its name shows, as they were when it was
  earned; the other kinds leave them null. These are checks in the database
  too.
- **The streak, the best streak and the goals' progress** are worked out on
  every load, from the marks, the periods and the pauses, and never stored.

**Personal data**:

- A pause's days say when the child was not training, and may hint at an
  illness or an injury. No reason is stored, so the days are all there is. They
  are needed for the streak, and reached only through the parent's account.
- An accomplishment repeats what the marks already say. An exercise's name is
  the library's, not personal.

## AI

Not used. Feature 009 may read the pauses later; that is its spec's to say.

## Edge cases

| Case | Behaviour |
|---|---|
| A week with a session done and a paused day | Done |
| A week with a paused day and nothing done | Neutral |
| The current week, nothing done yet | Neutral: the streak stands |
| A week partly covered by a period, nothing done, no pause | Missed |
| A week no period covers, nothing done | Neutral |
| A session done in a week no period covers, such as marked late | The week is done |
| A pause added over a missed week | The streak may grow on the next load, and may earn a streak length then |
| A pause deleted | The streak may shrink; nothing earned is taken away |
| A mark changed to `En tehnyt`, or removed, after it earned something | Kept |
| Only `En tehnyt` marks | No session counts earned; the streak is 0 |
| The 10th and the 25th session reached before the next load | Both earned on that load, the same day |
| A period with no sessions | Never a full period |
| A session added to a period after it earned a full period | Kept |
| An unmarked session deleted, leaving every other session `Tein kaiken` | A full period, on the next load |
| A period deleted, or its dates moved, after its full period | Kept, with the span it had |
| The same exercise picked as hardest and easiest in one mark, or on the same day | Not hard became easy: the easiest's day must be later |
| A hard-became-easy exercise renamed or deleted | Kept, with the name it had |
| Two loads at once that both earn the same accomplishment | One accomplishment |
| A week across the new year | One week, Monday to Sunday |
| A pause of one day | Allowed; its span is that day |
| A pause of 182 days | Allowed; 183 refused |
| A pause entirely in the past or the future | Allowed |
| Deleting a pause that is already gone | The pauses' page, as after a deletion |
| Another parent's pause, by any means | Never shown or changed |
| Not signed in | The sign-in page, as now |
| The trainer side locked | Its unlock page, as now |
| The database unreachable | The existing error page |

## Logging

Ids only: the user's, the pause's and the accomplishment's. Never a pause's
days, an accomplishment's kind or key, or an exercise's name.

| Event | Level | Line |
|---|---|---|
| A pause added | info | `pause created: user ‹id›, pause ‹id›` |
| A pause refused for an overlap | info | `pause refused, overlap: user ‹id›` |
| A pause deleted | info | `pause deleted: user ‹id›, pause ‹id›` |
| An accomplishment earned | info | `accomplishment earned: user ‹id›, accomplishment ‹id›` |
| A database failure in any of them, or in the streak's read | error | the event's name, `failed`, the ids, and Postgres's reason, as Feature 001 logs them |

## Security and secrets

- **No new environment variables.**
- **Who may do what**: the pauses' page and its writes are the trainer
  side's, behind its unlock. Any signed-in browser of the parent's account
  loads the child's side and `Omat treenit` with no unlock, and that load
  records what is earned, for that account only. Every read and write is
  limited to the parent's own pauses, periods, marks and accomplishments,
  checked on the server.

## Acceptance criteria

- [ ] The child's side shows the streak's line, and the pause's or the week's line under it, as *The child's side* gives them
- [ ] A week with a session done counts, the current week included; a paused week, a week no period covers, and the current week until a session is done in it neither break nor count; any other week breaks the streak
- [ ] `Omat treenit` shows `Putki nyt` and `Paras putki`, the accomplishments earned with their days, newest first, and the next goals with their progress
- [ ] Each accomplishment in the table is earned on the first load after its condition holds, once, and stays when the marks, pauses or periods change
- [ ] `Koko jakso tehty` is earned once per period, and `Vaikeasta helpoksi` once per exercise, each with the span or name it had when earned
- [ ] The trainer menu shows `Tauot`, whose page adds a pause and deletes one after its confirmation
- [ ] Each refusal in *Refusals* is shown beside its field, and nothing is saved
- [ ] Another parent's pauses and accomplishments appear nowhere, and cannot be deleted
- [ ] `Omat treenit` and the pauses' page fit a phone's width without sideways scrolling
- [ ] Every log line in *Logging* is written, with ids only

## Tests

| Level | What |
|---|---|
| Unit | Each week's kind: done, paused, uncovered, current, missed, a done week with a paused day, a week partly covered; the streak and the best streak over runs broken and joined by neutral weeks, across a new year, at midnight on Monday in Finnish time; each accomplishment's condition at its threshold and one below; hard became easy on the same day and a day later; the goals' lines, and the section left out; the streak's lines on the child's side for each case; a pause's rules at 1, 182 and 183 days, and an end before its start; each refusal's text |
| Integration, against Postgres | The tables, their checks and the overlap's exclusion; earning on a load, once under two loads at once; kept after a mark, a pause or a period changes; a full period's and an exercise's key and stored name; a deleted pause; another parent's data out of reach; the log lines |
| End to end | Marking sessions in two weeks and seeing the streak on the child's side and `Omat treenit`, with `Ensimmäinen treeni` earned; adding a pause, seeing its line, and deleting it; a refused pause |

## Open questions

None.
