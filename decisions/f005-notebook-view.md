# F005 — Notebook view of a period

Spec: `specs/005-notebook-view.md`. Issue: #38.

Replaces the child's side's placeholder from `decisions/f001-trainer-side.md`
(`Treenit tulevat tänne pian.`) with the period to copy.

## Context

The field has no phone and no network, so the child copies the period into a
notebook at home. The page has to show exactly what goes into the notebook,
in the order it is done, and nothing the child could change.

## Decision

- **One period is shown**: the current one, whose days include today in
  Finnish time, or else the one that starts next (`shownOf` in
  `src/lib/periods/rules.ts`). An earlier period is never shown.
- **Two reads in Feature 004's store**: the notebook, and one exercise as it
  is in a block, each in one read-only snapshot.
- **An exercise's address names the block exercise**, not the library
  exercise, so its page shows the block's amount.
- **An exercise's page is found only within the period shown**: the read
  joins it to that period, so an earlier period's or another parent's is not
  found.
- **The page has no forms, buttons or inputs**, and its one link away from
  reading is `Valmentaja`, as before.
- **Nothing is cached between loads**: the child's side reads the signed-in
  session, so each load renders anew and shows the parent's latest edit.

## Why

| Decision | Why |
|---|---|
| Current, else next | Before a period starts, the child can copy it ahead of the first training; after the last ends, the old one would be copied by mistake |
| The block exercise in the address | The same library exercise can be in several blocks with different amounts; the library's id could not say which |
| Found only within the period shown | The child's side shows no earlier period anywhere, and an old address in the browser's history should not bring one back |
| The reads in Feature 004's store | They read the same tables as the trainer side under the same ownership rule, so one place keeps who can read what |
| A video link opening a new tab, `noopener noreferrer` | The child returns to the page with the session still on it; the video's site gets neither the page nor the address |

## Not done

- A link on a page loaded just before midnight, when the period ends that
  day, finds nothing just after it: the period is no longer the one shown,
  and the spec says such an exercise is not found. Loading the page again
  shows the next period.

- Printing or a PDF: out of the spec's scope.
- Earlier periods for the child: out of the spec's scope.
