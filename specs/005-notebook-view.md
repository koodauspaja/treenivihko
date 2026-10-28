# 005 — Notebook view of a period

Issue: #38

## Summary

The child sees the period's sessions on one compact page and copies them into
the notebook by hand, since the field has no phone and no network. Tapping an
exercise shows its instructions and video at home.

## Scope

**In**

- The child's side shows the period to copy: the current one, or the next
  when none is current.
- Each session with its number, place and target length; its blocks' themes;
  each exercise's name and amount.
- An exercise's own page on the child's side: its instructions, and its video
  link when it has one.

**Out**

- Printing or a PDF.
- Marking a session: Feature 006.
- Any editing: the child's side only reads. Feature 006 later adds marking a
  session, and nothing else.
- Earlier periods.

## Who and where

The child, at home on the wifi-only device, on the child's side: signed in
with the parent's account, with no unlock (Feature 001). The page is what the
child copies before training; at the field there is nothing but the notebook.
Words are short, and a line is what the child writes down.

## What the user sees

Addresses are Finnish rows in `src/lib/routes.ts`; folders are English. Dates
and spans are shown as in Feature 004.

**The child's side**, at `/`: the greeting stays, and the placeholder
`Treenit tulevat tänne pian.` gives way to the period:

| Where | Text |
|---|---|
| The period's heading | `Jakso ‹span›` |
| When it is the next, not the current | `Alkaa ‹date›.` under the heading |
| Each session, in order | heading `Treeni ‹n›`, then `‹Paikka› · ‹target› min` |
| Each block, in order | its theme, as a subheading |
| Each exercise, in order | one line: its name, as a link to its page, `–`, and its amount as Feature 002 shows it: `Tikkaat: perusaskel – 10 kertaa`, `Lähdöt – 1 min 30 s` |
| A session with no blocks | `Treeni on vielä tyhjä.` |
| A block with no exercises | nothing: the theme alone |
| A period with no sessions | `Jaksossa ei ole vielä treenejä.` |
| No current or next period | `Jaksoa ei ole vielä tehty.` |
| The way to the trainer side | `Valmentaja`, as now, last |

Feature 006 adds each session's mark and the way to mark it, and the previous
period's sessions to mark, so the child's side writes marks and nothing else
(`specs/006-session-marks.md`). Feature 007 adds `Omat treenit`, before
`Valmentaja`: a page of every period that has started, with its sessions'
marks and none of their blocks or exercises (`specs/007-progress.md`).

The period shown is the current one, whose days include today in Finnish
time (`Europe/Helsinki`); when there is none, the one that starts next; when
there is neither, the message. An earlier period is never shown here.

**An exercise**, at `/harjoite/‹block exercise id›`:

| Where | Text |
|---|---|
| Heading | the exercise's name |
| Its amount in this session | as on the period's page: `10 kertaa` |
| Its duration | `‹n› min`, the library's |
| Its instructions | the library's, line breaks kept |
| Its video, when it has one | `Katso video`, opening in a new tab |
| Link back | `Takaisin`, to the child's side |

The address names the exercise as it is in its block, so the page shows the
block's amount, which may differ from the library's. A block exercise of a
period the child's side would not show, an earlier one, and one of another
parent's show `Sivua ei löytynyt.`

## Data

None new. The page reads Feature 004's periods and Feature 002's exercises.

**Personal data**: none.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| The current period ends today | It is shown all day; tomorrow the next is |
| No current period, and two in the future | The one that starts first is shown |
| The parent edits the period while the child's page is open | The next load shows the change; nothing on the page is cached between loads |
| An exercise the library renamed after the child copied it | The page shows the new name; the notebook keeps the old one |
| An exercise's address from an earlier period, or another parent's | `Sivua ei löytynyt.` |
| Not signed in | The sign-in page, as now |
| The database unreachable | The existing error page |

## Logging

None: the pages only read, and a failure is logged by the store it reads
from, as Feature 001 logs it. Feature 006's marking logs its own writes.

## Security and secrets

- **No new environment variables.**
- **Who may do what**: any signed-in browser of the parent's account sees the
  child's side, as now; it reads only the parent's own periods and the
  exercises in them, and never writes. Feature 006 adds the one write, a
  session's mark.

## Acceptance criteria

- [ ] The child's side shows the current period: each session with its number, place and target, its blocks' themes, and each exercise's name and amount, in order
- [ ] With no current period, it shows the next with `Alkaa ‹date›.`, and with neither, `Jaksoa ei ole vielä tehty.`
- [ ] An empty session shows `Treeni on vielä tyhjä.`, and an empty period `Jaksossa ei ole vielä treenejä.`
- [ ] An exercise's name leads to its page: its amount in the session, duration, instructions and `Katso video` when it has one
- [ ] An exercise of an earlier period, and another parent's, show `Sivua ei löytynyt.`
- [ ] The child's side never shows a way to change anything but the link to the trainer side (Feature 006 adds the links to mark a session)
- [ ] It fits a phone's width without sideways scrolling

## Tests

| Level | What |
|---|---|
| Unit | Which period is shown: current, next, none, at a period's last day and across midnight in Finnish time; each line's text with a count and a time; the empty messages; the exercise page's fields, with and without a video |
| Integration, against Postgres | The period, its sessions, blocks and exercises read in order for the child's side; another parent's out of reach; a block exercise of an earlier period not found |
| End to end | The child's side with a current period, an exercise's page and back; the next period before it starts; no period |

## Open questions

None.
