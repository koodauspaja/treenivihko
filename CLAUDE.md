# Project instructions

@AGENTS.md

## What this is

A training app for one child who trains on their own: football, and the
physical and motor skills around it. A parent, the trainer, sets up a program
for a period. The child copies it into a notebook and takes it to the field,
where there is no phone and no network. Back home on wifi, the child marks
what they did, and how it felt, with emojis. The app adapts the next period
from those marks.

Two things hold for every feature:

- **The field is offline.** Nothing the child needs during training may depend
  on the app. The app is for planning before and marking after.
- **The AI chooses, it never invents.** The Claude API picks and adjusts
  exercises from the curated library. An exercise that is not in the library
  never reaches the child.

## Hard rules

- **Three points belong to a human, whatever the work type:** agreeing the
  work, authorising the start, and merging. Everything Claude does sits
  between them, never across one.
  - **Agreeing** is a human saying **go** on the spec, or on the issue for a
    chore or a bug, once every open question is answered.
  - **Starting** is a human moving the card to `Ready`, or telling Claude to
    start, in any words. One message can do both: "sounds good, go ahead" is a
    go and a start.
  - **Engagement is not agreement.** "What's next?", "do you have what you
    need?", "splitting it is fine", and silence are not a go. Neither is
    Claude's own summary saying the checklist is confirmed.
- **Claude never moves a card to `Ready`, and never merges, on its own
  initiative.** When a human has said to, Claude does it and quotes the
  sentence it is acting on, in the same message. The quote is evidence, not a
  password: it has to read plainly as an instruction.
- **Every change goes through an issue, a branch and a pull request.** Nothing
  is committed to `main` directly, setup documents included. The one exception
  is Renovate's dependency pull requests, which have no issue: they pass the
  same checks, and a human merges them.
- **Every issue has its kind label and the Issue Type that pairs with it**:
  `enhancement` → Feature, `chore` → Task, `bug` → Bug. `gh issue create` cannot
  set the type, so it is set right after: `gh api
  repos/{owner}/{repo}/issues/N -X PATCH -f type=Task`.
- **An issue's box is ticked when its outcome is verified**, not when the code
  is written. If a criterion says a page shows something, load it and look. A
  box that cannot be ticked honestly says so on the box:
  `- [ ] The criterion — **not ticked: why**`. Boxes are ticked before the
  pull request opens, because nothing fails when they are skipped.
- **A pull request links its issue with a closing keyword**: `Closes #N`,
  never a bare `#N`. Renovate's pull requests have no issue to link. GitHub also reads the keyword in a squash commit body,
  backticks and all, so a merge that must not close the issue does not
  contain the phrase in any form.
- **The repository is public, and the user is a child.** No name, age, photo,
  school, team or location of a real person goes into code, fixtures, specs,
  issues, pull requests or logs. Test data uses invented names. Logs carry ids,
  never personal data.
- **Finnish for what a user sees, English for everything else**: code,
  comments, specs, decision records, issues, commits. Quoting a Finnish string
  as data is fine.
- **Unit coverage is 100%, and the thresholds are never lowered.** An uncovered
  line gets a test, or its file gets an exclusion with a reason.
- **Decision records are added, never edited.** A later record names the one
  it overrides, and the earlier one stays as it was.
- **A comment says what a thing is for**, in one to three lines, or names a
  constraint the code cannot show. Then come the paths of the decision records
  behind it, oldest first. History (how it used to work, what a reviewer said)
  goes in the record. No comment cites an issue or a pull request.
- **When behaviour changes, search for the old behaviour's words**, not only its
  code: the value, the name, the mechanism, across `specs/`, `decisions/`,
  comments and tests. A stale sentence is a contract someone will follow.

## Workflow

One path for features, chores and bugs. The differences:

| | Feature | Chore | Bug |
|---|---|---|---|
| Starts from | a spec, `/write-spec` | an issue | an issue |
| Go is said on | the spec | the issue | the issue |
| Decision record | always | when it changes something meaningful | when it changes something meaningful |
| Branch | `feature/NNN-short-name` | `chore/NNN-short-name` | `bug/NNN-short-name` |

1. **Open the issue** from its template, per `/start-work`. A feature's issue
   opens when its spec is started, so that the spec can take its number.
2. **Agree the work.** A feature's spec is written with `/write-spec`; every
   open question is answered, and a human says **go**. A feature then copies
   the spec's acceptance criteria to its issue: the issue is what the human
   approves, not the chat and not files on Claude's machine.
3. **Authorise the start.** Until a human has, there is no branch, no code and
   no board change. The card passes through `Ready` either way, then
   `In Progress`, then the branch exists. `/start-work` has the steps.
4. **Implement** within the issue: tests, the decision record, and nothing
   unrelated. Before changing code, read why it is the way it is: the decision
   records its comments link to, then `decisions/` and `specs/` searched for
   its names, then `git log -L` and `git log -S`.
5. **Open the pull request** with `/open-pr`: self-review first, boxes ticked,
   card to `In Review`. The aim is no review findings at all, rather than
   findings answered afterwards.
6. **A human merges**, or tells Claude to. However green it is.

If a chore or a bug turns out to need product decisions, it stops and becomes
a feature with a spec.

## Numbering

One number per piece of work: its issue's. The spec, the decision record and
the branch of issue 42 are `specs/042-…`, `decisions/042-…` and `…/42-…`, so
any one of them leads to the others.

## Reference

- Setting the infrastructure up from zero: `docs/setup/`, in the order its
  README gives. It is a procedure, not a description of the running system.
- Specs: `specs/`. Decision records: `decisions/`.
- The code: `src/app` for routes, `src/components` for UI, `src/lib/<domain>`
  for the rest (`decisions/012-project-init.md`). Tests mirror it under
  `tests/unit`, and `tests/e2e` holds the Playwright tests.
- **`npm run verify` before every push**: lint, type check, unit tests at 100%
  with `coverage-gaps`, the build and the end-to-end tests, stopping at the
  first failure. CI runs the same on every pull request from the people named in
  setup 001 and from Renovate, and fails for anyone else. A coverage exclusion
  goes in `scripts/coverage-plan.ts`, with its reason, and in
  `sonar-project.properties`; a unit test fails when the two disagree.
- The board: <https://github.com/orgs/koodauspaja/projects/3>, set up per
  `docs/setup/002-github-project-board.md`.
- Skills: `/write-spec`, `/start-work`, `/self-review`, `/open-pr` in
  `.claude/skills/`.
- What Sourcery checks, and why: `REVIEW_RULES.md`.
