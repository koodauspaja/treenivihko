# F002 — The exercise library

Spec: `specs/002-exercise-library.md`. Issue: #35.

Changes three things of `decisions/f001-trainer-side.md`'s trainer side: its
first page becomes a menu, the nickname moves to a page of its own, and
**Lukitse** reads **Lukitse ja palaa**, with the same behaviour.

## Context

Every later feature builds on the library: sessions are made of its
exercises (Feature 004), the import fills it (Feature 003), and the AI may
choose only from it (Feature 009). So the exercise's shape and the labels'
meaning have to be settled before any of them, and be the same for the
parent, a file and a model.

## Decision

- **One kind of exercise**, with a name, instructions, an optional video link,
  an amount as a count or a time, a duration, a level 1 to 3, a warm-up yes or
  no, and labels.
- **One fixed label list in code**, `src/lib/exercises/labels.ts`: 11 skills,
  3 places, 7 equipment items, each with a meaning. Stored by English key,
  shown by Finnish name. The database refuses a key not on the list, so
  changing it is a pull request and a migration.
- **Every rule in `rules.ts`**, which gives each field its Finnish refusal,
  and every write goes through it. **Each column's own rule is a check in the
  database too**: lengths, trimmed text, the amount, the duration, the level,
  a known label key, and a video link starting `https://`. The rules across
  rows (a skill and a place) and the link's parse are `rules.ts`'s alone. The
  store writes only a `CheckedExercise`, a type only `readExercise` makes.
- **One list of whitespace**, `src/lib/text.ts`: what `tidy` trims and what
  the database's trimmed checks refuse, so the two cannot drift.
- **An exercise and its labels are read in one statement**, so a save cannot
  land between them.
- **A name unique per parent by its lowercase, by ICU**, decided by the unique index
  and read back from its error, so two saves at once cannot both pass.
- **The library belongs to the parent who made it**, and every read and write
  is limited to their own.
- **The filters**: any ticked skill, any ticked place, and only exercises
  whose equipment is all available; they live in the address.
- **The form starts again from what its action sends back**: what was typed
  after a refusal, nothing after an add, so the next exercise can be entered
  straight away.
- **A Finnish not-found page** for the whole app.
- **`logged` and the character count are shared**, `src/lib/db/logged.ts` and
  `src/lib/text.ts`, as the trainer side and the library both use them.

## Why

| Decision | Why |
|---|---|
| Column checks in the database, the rest in `rules.ts` | A column check costs nothing and holds against a careless write; a skill-and-place check across rows would need a trigger, for writes that all come through `readExercise` |
| A `CheckedExercise` type, not a second check in the store | The compiler refuses a write that skipped the rules; a second check would be a second copy of them |
| Names lowercased by ICU in the unique index, not by the database's locale | Under a C locale, Postgres's `lower` leaves `Ä` as it is, so `Äijä` and `äIJÄ` would both pass |
| The whitespace listed, not `\s` in SQL | Postgres's `\s` follows the server's locale; a list is the same on both sides, and a test holds it to JavaScript's `trim` |
| A line break counted as one | Browsers send a textarea's line breaks as `\r\n`; a person counts one |
| A video link counted as stored | It is never normalised, which could turn it into another address, so its length is what Postgres counts |
| An id the store could not have made is no exercise | A crafted address holding U+0000 would otherwise reach Postgres, which cannot compare it |
| An add sent again, after its answer was lost, refused as a name in use | The first is saved and in the library, and the message says why; no data is lost or overwritten. Keying adds by a form-made id was tried: its upsert brought back deleted exercises and overwrote later edits |
| Labels in code, not editable in the app | The filters, the import and the AI all depend on the same words, and a renamed label would quietly change what each of them means |
| English keys, Finnish names | A Finnish name can be corrected without a migration, and keys stay out of the user's sight |
| Warm-up as a field, not a label | It is a property an exercise has besides its skill, as easy ladder steps can be both; a group with one label in it was the sign. Sessions open with one (Features 004 and 009) |
| Equipment filtered by what is available | Planning asks "what can be done with what we have"; any-of would show exercises needing a goal when there is none |
| Equipment starts all ticked, with a marker for "sent" | Nothing ticked has to mean nothing available, not "no filter", once the parent has unticked it |
| Count fields named `Kertoja` and `Sekuntia`, duration `Kesto (min)` | The amount's choice already reads `Kertaa`, and a label read twice is ambiguous to a person and to a test |
| The library the parent's own | As the child's profile is; a second adult would have a library of their own, which Feature 001 already scopes out |
| `exercises/store.ts` excluded from unit coverage | As `trainer/store.ts`: each function is a query whose point is what Postgres does with it; `tests/integration/exercises.test.ts` runs them |

## Consequences

- **A new label is a pull request** that adds it to `labels.ts` and a
  migration replacing the database's check.
- **Deleting an exercise deletes its labels**; once sessions use exercises,
  Feature 004 decides what deleting one in use means.
- **The end-to-end tests give each worker its own parent**, since tests in
  several files now run at once; Playwright runs at most 4 workers.
