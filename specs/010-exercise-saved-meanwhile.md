# 010 — An exercise changed meanwhile is not overwritten

Issue: #53

## Summary

When the parent saves an exercise that was saved elsewhere after their form
was opened, as from a second tab, the save is refused rather than silently
replacing the other edit. The form keeps what the parent typed and says why;
they look at the version saved now, and save theirs over it only if they mean
to.

## Scope

**In**

- Saving an existing exercise in the library (Feature 002) checks that it is
  unchanged since its form was opened.
- The refusal, with what was typed kept, a link to the saved version, and
  `Tallenna silti` to save over it on purpose.
- Feature 002's spec says, for "Two saves of the same exercise at once", that
  the later one wins; this changes it, and that spec is updated to say so.

**Out**

- Merging two edits field by field.
- Showing the two versions side by side.
- Adding an exercise, and the import, which only add.
- Deleting an exercise changed meanwhile: `Poista harjoite` deletes it as now.
- An exercise's amount in a block (Feature 004), which is the block's own.

## Who and where

The parent, at home on wifi, on the trainer side behind its unlock (Feature
001). The child sees nothing of it.

## What the user sees

On an exercise's page, at `/valmentaja/harjoitteet/‹id›` (Feature 002), when
`Tallenna` is refused because the exercise changed after the page was opened:

| Where | Text |
|---|---|
| Above the button | `Harjoitetta on muutettu muualla sen jälkeen, kun avasit sen. Tallennus ei korvannut muutosta.` |
| A link, beside it | `Näytä nykyinen`, which opens the exercise's page as it is saved now in a new tab |
| A second button | `Tallenna silti`, which saves what is in the form over the other change |
| The form's fields | What the parent typed, as sent |

After `Tallenna silti`, the page shows Feature 002's `Tallennettu.`, and the
form shows the exercise as saved, as after any save. `Tallenna` stays where
it is, and checks again.

## Data

| Table | Columns | Why |
|---|---|---|
| `exercise` (Feature 002) | adds `revision`, integer, not null, default 1 | Raised by one on every save. The form carries the revision it was opened at, and a save of another is refused |

- **Every save raises it**, `Tallenna silti`'s included, and one that changes
  nothing too.
- **Adding** starts at 1; **the import** adds at 1.

**Personal data**: none. A revision is a count.

## AI

Not used.

## Edge cases

| Case | Behaviour |
|---|---|
| The exercise was deleted meanwhile | Feature 002's `Sivua ei löytynyt.`, before any check of the revision |
| Changed meanwhile, and the name typed is now another exercise's | The change meanwhile is told first; `Tallenna silti` then gets Feature 002's name refusal if it still applies |
| Changed again after the refusal, before `Tallenna silti` | `Tallenna silti` carries the revision the refusal found, so it is refused again in the same way, with the newer change not overwritten |
| A field refused by Feature 002's rules | Refused as now, before the revision is checked; nothing saved |
| A save sent again after its answer was lost | Refused as changed meanwhile, since the first raised the revision; `Tallenna silti` saves the same values again |
| The parent saves twice in one tab | The page passes the new revision after each save, so the next save is not refused |
| The version still serving during a deploy | It saves without raising `revision`; a save by it in that window is not seen as a change. Only the new version reads the revision |
| An exercise's block amount changed in a period | Not a change to the exercise; its revision stays |

## Logging

Ids only.

| Event | Level | Line |
|---|---|---|
| A save refused, changed meanwhile | info | `exercise refused, changed meanwhile: user ‹id›, exercise ‹id›` |
| A save over a change, with `Tallenna silti` | info | `exercise updated: user ‹id›, exercise ‹id›, over a change` |

Feature 002's other lines stand.

## Security and secrets

- **No new environment variables.**
- **Who may do what**: as Feature 002's save, behind the trainer side's
  unlock, the action checking it itself, within the parent's own library.

## Acceptance criteria

- [ ] Saving an exercise whose form was opened before another save of it is refused with `Harjoitetta on muutettu muualla sen jälkeen, kun avasit sen. Tallennus ei korvannut muutosta.`, and nothing is saved
- [ ] The refused form keeps what was typed, and offers `Näytä nykyinen`, opening the saved version in a new tab, and `Tallenna silti`
- [ ] `Tallenna silti` saves what was typed over the other change, and shows `Tallennettu.`
- [ ] `Tallenna silti` after the exercise changed again is refused the same way
- [ ] Saving twice in one tab is not refused
- [ ] A deleted exercise still gives `Sivua ei löytynyt.`, and a field's refusal comes before the revision's
- [ ] Every save raises the revision by one; an add and the import start at 1
- [ ] Feature 002's spec no longer says the later save wins
- [ ] The spec's two log lines are written, with ids only

## Tests

| Level | What |
|---|---|
| Unit | The action: a save with the current revision, one with an older, `Tallenna silti`, a deleted exercise, a field refused first; the form: the refusal's message, link and button, the typed values kept, and the revision sent |
| Integration, against Postgres | `revision`'s default on existing rows and on adds and imports; a save raising it; a save with an older revision refused and nothing changed; two saves at once with the same revision, one saved and one refused; `Tallenna silti` with the found revision; one parent's exercises out of another's reach; the log lines |
| End to end | Two tabs open on one exercise: the first saves, the second is refused with its typed values kept, `Näytä nykyinen` opens the saved version, and `Tallenna silti` saves; saving twice in one tab |

## Open questions

None.
