# F010 — An exercise changed meanwhile is not overwritten

Spec: `specs/010-exercise-saved-meanwhile.md`. Issue: #53.

Overrides Feature 002's spec on "Two saves of the same exercise at once: the
later one wins", and with it the lines that lean on it:
`decisions/050-sourcery-calibration.md`, *Why*, "as Feature 002's spec
decided (the later one wins)"; `decisions/f004-periods-and-sessions.md`, *Not
done*, "as in Feature 002"; and `decisions/f006-session-marks.md`, *Not done*,
"as in Features 002 and 004". A block's amount and a mark still go by the
later save; a library exercise's save no longer does.

## Context

A save of an exercise replaced it whatever had happened since its form was
opened. With two tabs, or a form left open while the exercise was changed in
another, the later save silently threw away the earlier edit, which Sourcery
raised on #52.

## Decision

- **A revision on each exercise**, `exercise.revision`, an integer from 1,
  raised by one on every save.
- **The form carries the revision its page was opened at**, in a hidden
  field; after each save the page is refreshed and passes the new one.
- **The store saves only from the revision it is given**, checking and
  raising it in the update's own `where` (`updateExercise`), so two saves from
  one revision cannot both pass: Postgres re-reads the row the second one
  waited on, and it no longer matches.
- **A refused save says what it found**: gone, as `missing`, or `changed`
  with the revision now saved. A field refused by Feature 002's rules comes
  first, then a change meanwhile, then a name in use.
- **`Tallenna silti` saves from the revision the refusal found**, so it
  overwrites only the change the parent was told of; a further change is
  refused the same way. Its save is logged `over a change`.
- **What was typed is kept**: the action sends back what the form sent, as
  for any refusal.
- **`Tallenna silti` comes after `Tallenna`** in the form, since Enter in a
  field submits with the first submit button: Enter never overwrites.
- **A revision the action cannot read is 0**: none, an empty one, a sign, a
  decimal, or more than 9 digits, which no exercise is at, so the save is
  refused rather than an error page from Postgres's integer range.

## Why

| Decision | Why |
|---|---|
| A revision, not `updated_at` | `updated_at` is stored to the microsecond and read back by JavaScript to the millisecond, so a timestamp the form carried would rarely equal the one stored |
| Checked in the update itself | A read, then a write, could let a save land between them |
| The page's revision only, not the save's own | Next sends the refreshed page with the action's answer, so the next save already carries the new revision; an end-to-end test saves twice in one tab with no pause between |
| A second button, not a reload | The parent chose to keep what they typed and to overwrite only on purpose; a reload would lose a long instruction |
| `Näytä nykyinen` in a new tab | What was typed stays in the form while the parent compares |
| The block's amount and the mark unchanged | Neither has lost an edit in use: a block amount is one field, and a mark is the child's, made once and changed rarely |

## Consequences

- **During a deploy**, the version still serving saves without raising the
  revision, so a save by it in that window is not seen as a change.
- **A save sent again after its answer was lost** is refused as changed,
  since the first raised the revision; `Tallenna silti` saves the same values
  again.
- **Every save of an exercise now needs its revision**: a caller without one
  cannot write, which keeps a later path from overwriting unseen.
