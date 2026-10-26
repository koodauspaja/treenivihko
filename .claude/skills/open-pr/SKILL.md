---
name: open-pr
description: Review your own diff, then open the pull request and hand it to a human. Use when the work on a branch is done and its tests pass.
---

# Opening a pull request

1. **Review your own diff before the first push.** Run the `code-review` skill
   at low effort on it, and fix what it finds. Then check for the old words:
   when behaviour changed, search `specs/`, `decisions/`, comments and tests for
   the value, the name or the mechanism it replaced. A later push repeats the
   check on what it changed.
2. **Commit** with a conventional message: `feat: …`, `fix: …`, `chore: …` or
   `docs: …`.
3. **Tick the issue's boxes** (Acceptance criteria always, and Scope where the
   template has it) before the pull request opens. A box is ticked when its
   outcome is verified. One that cannot be ticked honestly says so on the box:

   ```
   - [ ] The criterion — **not ticked: why**
   ```

   A criterion that resists ticking usually means something was missed.
4. **Push and open the pull request** against `main`, filling in
   `.github/PULL_REQUEST_TEMPLATE.md`:
   - `Closes #N` on the first line. Only a closing keyword links the pull
     request to its issue.
   - The spec and the decision record, or `Not applicable` with the work type.
   - The summary, and what a reviewer should check.
   - The Checklist's self-review box, with what step 1 changed or "nothing
     found". Leave a box unticked when it is not true.
5. **Move the card to `In Review`.** Opening the pull request moves it to
   `In Progress` on its own, so this step moves it on.
6. **Hand it to the human.** Never merge on your own initiative. Merge when a
   human says to, quoting what they said.

Reading the review and passing its gate are added to this skill when the
review tools are set up.
