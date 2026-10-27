# F003 — The exercise import

Spec: `specs/003-exercise-import.md`. Issue: #36.

Changes two things of `decisions/f002-exercise-library.md`: the labels'
meanings in `src/lib/exercises/labels.ts` are Finnish, not English, and an
exercise's text refuses a lone surrogate as it refuses U+0000. The second
applies to `decisions/f001-trainer-side.md`'s nickname too, by the same
check in `src/lib/text.ts`.

## Context

A library filled by hand, one form at a time, is slow to start. The parent
can ask an AI tool for exercises, but its answer has to meet the same rules
as an exercise typed into the form, and the labels have to mean the same
for the tool as for the parent and, later, for the app's own AI (Feature 009).

## Decision

- **One JSON list**, read from a chosen file or from pasted text, exactly one
  of the two, at most 500 000 bytes and 100 exercises. Field names are
  Finnish without diacritics, labels are their Finnish names.
- **Every exercise read into Feature 002's form values and through
  `readExercise`**, so the import has no copy of the library's rules. Its own
  checks are only the format's: fields, types, exactly one amount, labels by
  name, and names used twice.
- **All or nothing**: every failing exercise is listed with every reason, and
  the import is saved only when none fail, in one transaction.
- **Whole numbers written in digits only**, read from the number's source
  text, so `2.0` and `1e1` are refused as the form refuses them.
- **A field not in the format is refused**, and so is `null` where the format
  allows only leaving a field out.
- **An import's rows inserted in one order by name**, in two statements.
- **A name in the library, or earlier in the import, is refused before the
  save**, compared by its lowercase; the unique index still decides a name
  saved meanwhile, which refuses the whole import.
- **A prompt for an AI tool**, built from the label list, on the page with a
  copy button.
- **The labels' meanings in Finnish**, in the one list, since the prompt
  shows them to the parent.
- **The size checked in the browser too**, of the file and the text together, before they are sent.

## Why

| Decision | Why |
|---|---|
| JSON, not CSV | AI tools write it reliably, and a list of labels is a list, not a separated cell |
| A file or pasted text | An AI tool answers in text; saving it as a file first is awkward on a phone |
| Through `readExercise`, not a second set of rules | One copy of each rule, so the form and the import cannot drift; each refusal is the form's text |
| All or nothing | A half-imported file leaves the parent working out which exercises are in; fixing the file and importing it again is one step |
| Whole numbers by source text | `JSON.parse` turns `2.0` into `2`; only the reviver's source text, which Node 24 gives, tells them apart |
| An unknown field refused | A typo in an optional field, such as `välineet`, would otherwise drop the equipment without a word |
| `null` refused where a field may only be left out | `null` is a value the tool chose to write; reading it as the default would hide a misunderstanding of the format |
| Names compared by JavaScript's lowercase before the save | It folds as the index's ICU `lower` does for the letters a name uses; where the two could differ, the index refuses the whole import with its own message, and nothing is half saved |
| A lone surrogate refused, as U+0000 is | Only a JSON escape such as `\ud800` writes one, as a browser's form cannot; Postgres would save it as U+FFFD, a different text from the one checked |
| Labels matched ignoring case and spaces | Labels are unique by name in any case, so this reads `jalkatyö` as meant and never as another label |
| An empty file counts as none chosen | A file field with nothing chosen still sends an empty file |
| Size checked in the browser too, file and text together | A body over Next's 1 MB is refused before the action runs, and the parent would see the error page rather than the size refusal |
| Rows inserted in one order by name | Two imports at once that share names would otherwise check the unique index in different orders and could deadlock; in one order, the later waits, then gets the import's refusal for a name saved meanwhile |
| A deadlock refused as the name in use, in every write of an exercise | These writes can deadlock only on the name index, and Postgres lets one of the two commit, so the name is then in use for the other; the refusal is true, where the error page would not say what happened |
| The labels' meanings in Finnish | The prompt shows them to the parent, and what a user sees is Finnish; one list keeps the import, the parent and Feature 009's AI labelling by the same words |
| A prompt built from the list | It always names exactly the labels the import accepts |
| `exercises/store.ts` still excluded from unit coverage | As `decisions/f002-exercise-library.md`; `importExercises` is a query, and `tests/integration/exercises.test.ts` runs it |

## Consequences

- **A label renamed in Finnish breaks older files** that use the old name;
  they are refused by name, and nothing is saved.
- **The prompt's wording may change** after use, without changing the format.
- **An import never changes an exercise** already in the library.
- **An import and a rename at once can deadlock**, when they claim the same
  names in opposite orders; it takes one parent's own two requests in the same
  instant. Postgres aborts one, nothing is half saved, and the one aborted is
  refused as the name in use, as the other has saved it.
- **A deadlock is read as the name in use** because each write of an exercise
  touches its own row and its own labels besides the name index. A write that
  later takes another lock, such as on a session using an exercise
  (Feature 004), has to revisit `isNameInUse` in `src/lib/exercises/store.ts`.
- **A size refused in the browser is not logged**: nothing reached the server.
  The server's `size` line is for a request that skips the page.
