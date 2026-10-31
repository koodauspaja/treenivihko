# 009 — A period adapted to the marks

Issue: #41

## Summary

When the parent makes a new period, it can start as the latest one adapted
to how the child marked it: amounts go up after a session that went well
and down after a hard one, an exercise liked least is swapped for a similar
one, and one found easiest moves up a level. Fixed rules in code do it, the
same marks always giving the same period, with no AI and nothing sent
anywhere. The parent sees what changed, once, and edits the period as any.

## Scope

**In**

- A choice on Feature 004's new period: `Sovita edellisen jakson
  merkintöihin`.
- Rules, per session of the latest period, from its mark: each amount up or
  down 20%, the hardest exercise easier, the liked least swapped for a
  similar one, the easiest swapped for one a level up.
- The list of what changed, shown once after the period is made.

**Out**

- The Claude API, or any AI: a later feature may add one.
- Making sessions longer or shorter: each keeps its exercises' count and its
  target.
- Marks older than the latest period.
- Pauses (Feature 008): not read.
- Adapting a period that already exists.
- Storing what changed: the list is shown once, and gone on the next load.

## Who and where

The parent, at home on wifi, on the trainer side behind its unlock (Feature
001). The child sees the new period as any, once it starts, and copies it
into the notebook.

## What the user sees

Every page below is the trainer side's, behind its unlock.

**A new period**, at `/valmentaja/jaksot/uusi` (Feature 004), gains:

| Where | Text |
|---|---|
| The choice, when the latest period has at least one marked session | `Sovita edellisen jakson merkintöihin`, a checkbox, checked, under `Uusi jakso alkaa kopiona jaksosta ‹span›.` |
| What it does, under the choice | `Määrät nousevat hyvin menneissä treeneissä ja laskevat raskaissa. Vähiten mieluisa harjoite vaihtuu samankaltaiseen ja helpoin vaikeampaan.` |

Without the choice, or with it unchecked, `Luo jakso` makes Feature 004's
plain copy and opens the period's page, as now.

**After `Luo jakso` with the choice checked**, the same page shows, in place
of the form:

| Where | Text |
|---|---|
| Heading | `Jakso ‹span› luotu` |
| With changes | `Merkintöjen mukaan muutettu:`, then one line per change, in session order |
| An amount | `Treeni ‹n›: ‹name› ‹old amount› → ‹new amount›`, such as `Treeni 2: Kuljetus kartioilla 10 kertaa → 12 kertaa` |
| A swap | `Treeni ‹n›: ‹old name› vaihtui harjoitteeseen ‹new name› (‹amount›)` |
| With none | `Merkinnät eivät muuttaneet mitään.` |
| Link | `Avaa jakso`, to the period's page |

Amounts are shown as Feature 002 shows them: `10 kertaa`, `30 s`, `1 min 30 s`.

Refusals are Feature 004's, with nothing saved.

## The rules

The new period is Feature 004's copy of the latest period. Then, for each
session of the latest period that has a mark, the copied session changes as
below. A session with no mark is copied as it is.

**The session's direction**, from its mark:

| Mark | Direction |
|---|---|
| `done`, feeling 😄 or 🙂 (5 or 4) | up |
| `done`, feeling 😐 (3) or skipped | none |
| `done`, feeling 🙁 or 😫 (2 or 1) | down |
| `partly`, any feeling | down |
| `not_done` | down |

**Each exercise in the session**, in block order and then position order:

| Case | Change |
|---|---|
| Liked best | Never swapped; its amount follows the direction |
| Hardest | Never swapped; its amount goes down, whatever the direction |
| Liked least | Swapped for a similar exercise, below; if there is none, its amount follows the direction |
| Easiest, with the direction up | Swapped for one a level up, below; if there is none, its amount goes up |
| Easiest, otherwise | Its amount follows the direction |
| Any other | Its amount follows the direction |

When one exercise is several picks, the first row of this table that names
it decides. A pick whose exercise has been deleted is no pick. An exercise
that appears in more than one block of the session is changed in each.

**An amount up or down** is multiplied by 1.2 or 0.8, then:

- a count is rounded to the nearest whole number, and a time to the nearest
  5 seconds, halves away from zero;
- it moves by at least one: 1 time, or 5 seconds;
- it is kept between half and double the library exercise's default amount,
  half rounded up and double rounded down to a whole count or 5 seconds;
- and within Feature 002's rule: 1–100 times, or 5–600 seconds.

When the block exercise's kind is no longer the library exercise's (Feature
004 keeps the kind it was added with), its amount is not changed.

**A similar exercise**, for the liked least, is a library exercise that:

- shares at least one skill label with it, and has its level;
- fits the session: has its place, and needs only equipment at hand;
- is not already in the copied session.

**One a level up**, for the easiest, is the same, with a level one higher. A
level 3 exercise has none.

Among those that fit, the first is one not in the latest period at all, then
any; ties go by Finnish alphabetical order of name. A swapped exercise takes
its library default amount, and its place in the block.

## Data

Nothing new. The new period is stored as Feature 004 stores a copy.

**Personal data**: none stored. The rules read the latest period's marks,
which Feature 006 stores.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| No latest period | No choice: `Uusi jakso alkaa tyhjänä.` as now |
| The latest period has no marked session | No choice; `Luo jakso` makes the plain copy |
| The latest period starts in the future | It is still the latest; with no marks, no choice |
| An amount already at the half or double bound | It stays; no change is listed |
| 5 seconds down | 4 s rounds to 5 s; the minimum move makes 0 s; Feature 002's rule brings it back to 5 s: unchanged, and not listed |
| 1 time down | 0.8 rounds to 1; the minimum move makes 0; Feature 002's rule brings it back to 1: unchanged, and not listed |
| No similar exercise for the liked least | Its amount follows the direction, listed as an amount change when it moves |
| Two picks the same exercise, liked best and liked least | Liked best decides: kept, never swapped |
| A swap whose only candidate is already in the session | No swap |
| Two liked-least swaps in one period | Each session is decided on its own; the same exercise may be chosen in two sessions |
| A library exercise changed meanwhile, such as its level or labels | The rules read the library as it is when `Luo jakso` is pressed |
| The marks change while the page is open | The rules read the marks as they are when `Luo jakso` is pressed |
| Reloading the page after creating | The form is shown again, for another period; the list is gone |
| The copy refused for an overlap | Feature 004's refusal; nothing saved, nothing listed |

## Logging

Ids only. Never an exercise's name.

| Event | Level | Line |
|---|---|---|
| A period created, adapted | info | `period created: user ‹id›, period ‹id›, from period ‹id›, adapted, changes ‹n›` |

Feature 004's other lines stand, the plain copy's included.

## Security and secrets

- **No new environment variables.**
- **Who may do what**: as Feature 004's new period, behind the trainer
  side's unlock, the action checking it itself. The rules read only the
  parent's own periods, marks and library.

## Acceptance criteria

- [ ] With a marked latest period, the new period's page shows `Sovita edellisen jakson merkintöihin`, checked, and the text under it; without one, it shows neither
- [ ] Unchecked, `Luo jakso` makes Feature 004's plain copy and opens its page
- [ ] Checked, after a `done` 😄 or 🙂 session, each of its amounts goes up 20%; after `partly`, `not_done`, or `done` 🙁 or 😫, down 20%; after `done` 😐 or skipped, unchanged
- [ ] The hardest exercise's amount goes down even in a session that went well, and it is never swapped
- [ ] The liked-least exercise is swapped for one sharing a skill label, with its level, fitting the session and not in it, preferring one not in the latest period, then by name; with none, it stays
- [ ] In a session that went well, the easiest is swapped for one a level up by the same rules; a level 3 one goes up in amount instead
- [ ] An amount never goes below half or above double its library default, nor outside Feature 002's rule, and moves by at least 1 time or 5 seconds unless one of those bounds stops it
- [ ] A session with no mark is copied unchanged
- [ ] After creating, the page lists each change in session order, or `Merkinnät eivät muuttaneet mitään.`, with `Avaa jakso`; a reload shows the form again
- [ ] The adapted copy is saved in one transaction, and its log line has the number of changes

## Tests

| Level | What |
|---|---|
| Unit | The direction for every status and feeling; an amount up and down at 1, 2, 5, 10 and 100 times and 5, 30, 595 and 600 seconds; the minimum move; the half and double bounds and their rounding; a changed kind left alone; each pick's row, and an exercise that is two picks; the similar exercise and the one a level up, with their order and tie-break, none found, and level 3; an exercise in two blocks; a session with no mark; the change list's lines and the no-change line |
| Integration, against Postgres | The adapted copy in one transaction, with the library and marks read as they are; an overlap refused with nothing saved; one parent's rows out of another's reach; the log line |
| End to end | A marked period, then a new one with the choice: the change list, and the period's page showing the new amounts and the swap; the choice unchecked making the plain copy; no choice without marks |

## Open questions

None.
