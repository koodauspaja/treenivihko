# 007 — The child's progress

Issue: #40

## Summary

The child sees what they have done: every period that has started, with each
session's mark, and each exercise they have picked, with how many times it
was liked best, liked least, easiest and hardest. The parent sees each
session's full mark on the trainer side, which Feature 006 left to this one.

## Scope

**In**

- A progress page on the child's side: every period that has started, newest
  first, each with its count of sessions done and each session's mark line;
  then every picked exercise with its four counts.
- On the trainer side, each session's mark under it on its period's page: the
  mark's line and its four picks by name.

**Out**

- Comparing with anyone else.
- Streaks, a pause, and accomplishments: Feature 008.
- Using the marks to build a period: Feature 009.
- Marking from the progress page: marking stays on the child's side at `/`
  (`specs/006-session-marks.md`).
- Charts, and totals over all periods.
- Personal records, such as a time or a count beaten: nothing stores them.

## Who and where

The child, at home on the wifi-only device, on the child's side: signed in
with the parent's account, with no unlock (Feature 001). The parent, at home,
on the trainer side behind its unlock. Nothing here is needed at the field.

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English. Dates
and spans are shown as in Feature 004: `3.11.2026`, `3.11.–16.11.2026`. A
mark's line is Feature 006's: `Tehty 3.11.2026 😄`, `Osittain 3.11.2026`,
`Ei tehty`.

**A period that has started** is one whose start is today or earlier, in
Finnish time (`Europe/Helsinki`): the current one and every earlier one. The
next period, before it starts, is not one.

**The child's side**, at `/`, gains a link:

| Where | Text |
|---|---|
| After the periods, before `Valmentaja` | `Omat treenit`, as a link to the progress page |

**The progress page**, at `/omat-treenit`:

| Where | Text |
|---|---|
| Heading | `Omat treenit` |
| Each period that has started, newest first | heading `Jakso ‹span›`, then `Tehty ‹n›/‹total›`, where `‹n›` counts its sessions marked `Tein kaiken` or `Tein osan`, and `‹total›` all its sessions |
| Each session of it, in order | `Treeni ‹n›`, then its mark's line, or `Ei merkitty` |
| A period with no sessions | `Jaksossa ei ole vielä treenejä.` under its heading, with no `Tehty` line |
| No period has started | `Jaksoa ei ole vielä aloitettu.` in place of the periods |
| Section heading | `Harjoitteet` |
| Each exercise picked at least once | its name, and under it its counts in the marking page's order, a count of 0 left out: `Kivoin 4 · Helpoin 1 · Vaikein 2` |
| Their order | by `Kivoin`'s count, highest first; then by all four counts together; then by name |
| No exercise picked | `Harjoitteita ei ole vielä valittu.` |
| Link back | `Takaisin`, to the child's side |

The page only reads: it has no `Merkitse` or `Muuta`. An exercise's name is
its current name in the library. The exercise lines name no link: an
exercise's page belongs to a block of the period shown (Feature 005).

**A period on the trainer side**, at `/valmentaja/jaksot/‹id›`, gains under
each session's `Treeni ‹n›` and `‹Paikka›, ‹total› / ‹target› min`, when the
session is marked:

| Where | Text |
|---|---|
| Its mark's line | as on the child's side: `Tehty 3.11.2026 😄` |
| Each pick that is set, in the marking page's order, one line each | `Kivoin: ‹name›`, `Tylsin: ‹name›`, `Helpoin: ‹name›`, `Vaikein: ‹name›` |

A session not marked shows nothing more than it does now.

## Data

Nothing new is stored. The page reads the parent's periods, their sessions,
their marks (`session_mark`, Feature 006) and the names of the exercises the
marks pick.

- **The counts** are worked out on every read, over the marks of the periods
  that have started. A pick counts once for its exercise, whatever block or
  session it sits in now.
- **A pick cleared** by its exercise's deletion (Feature 006) counts for
  nothing.

**Personal data**: none new. The page shows the marks Feature 006 stores.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| A session marked `En tehnyt` | Its line `Ei tehty`; it does not count in `Tehty ‹n›/‹total›` and has no picks |
| A session marked `Tein osan` | Counts in `Tehty ‹n›/‹total›` |
| The current period's sessions not yet trained | `Ei merkitty`, and in `‹total›` |
| An earlier period no longer markable, with sessions never marked | Shown, each `Ei merkitty` |
| The parent moves a marked period's start to after today | It is no longer a period that has started: it and its picks leave the page until it starts |
| The same exercise picked as both liked best and liked least in one mark | Counts once in each |
| A picked exercise the parent removed from the session afterwards | Still counts, and still shows on the trainer side |
| A picked exercise the parent renamed | Its new name, on both sides |
| Two exercises with the same counts | Ordered by name, in Finnish order |
| Many periods | All shown; nothing is paged |
| Not signed in | The sign-in page, as now |
| The trainer side locked | Its unlock page, as now |
| The database unreachable | The existing error page |

## Logging

None: the pages only read, and a failure is logged by the store it reads
from, as Feature 001 logs it.

## Security and secrets

- **No new environment variables.**
- **Who may do what**: any signed-in browser of the parent's account sees the
  progress page, with no unlock, as it sees the child's side. It reads only
  the parent's own periods, marks and exercises, and never writes. The marks
  on the trainer side are behind its unlock, as the rest of it.

## Acceptance criteria

- [ ] The child's side shows `Omat treenit` before `Valmentaja`, linking to `/omat-treenit`
- [ ] The progress page shows every period that has started, newest first, each with `Tehty ‹n›/‹total›` and each session's mark line or `Ei merkitty`
- [ ] The next period, before it starts, is not on the progress page
- [ ] `Tehty ‹n›/‹total›` counts sessions marked `Tein kaiken` or `Tein osan`, and not `En tehnyt` or unmarked ones
- [ ] Each picked exercise shows its counts, those of 0 left out, in the order *What the user sees* gives
- [ ] The empty states show `Jaksoa ei ole vielä aloitettu.`, `Jaksossa ei ole vielä treenejä.` and `Harjoitteita ei ole vielä valittu.`
- [ ] A period's page on the trainer side shows each marked session's line and its set picks by name
- [ ] Another parent's periods, marks and exercises appear on neither page
- [ ] The progress page fits a phone's width without sideways scrolling

## Tests

| Level | What |
|---|---|
| Unit | Which periods have started: today as a start, tomorrow, across midnight in Finnish time; the `Tehty` count for each status and for unmarked sessions; the counts' line with zeros left out; the exercises' order, with ties on `Kivoin`, on all four, and on name with `Ä` and `Ö`; the trainer side's pick lines with some skipped |
| Integration, against Postgres | The reads: periods that have started, their sessions and marks in order; the counts over several periods; a pick of a deleted exercise not counted; a pick of an exercise removed from its session counted; a period moved into the future left out; another parent's data out of reach |
| End to end | Marking two sessions, then seeing them and their counts on the progress page; the empty page; a marked session's line and picks on the trainer side |

## Open questions

None.
