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
   Before pushing, check the size: `git diff origin/main...HEAD | wc -c`.
   Sourcery skips a pull request over 150,000 characters, so stay well under
   it, and split the work into pull requests merged one after another
   otherwise.
5. **Move the card to `In Review`.** Opening the pull request moves it to
   `In Progress` on its own, so this step moves it on.
6. **Pass the Sourcery gate** (below) and fix what the review finds. A fix is
   a new commit, and the gate is passed again on the new head.
7. **Hand it to the human.** Never merge on your own initiative. Merge when a
   human says to, quoting what they said.

## The Sourcery gate

**A green check is not a review.** When Sourcery skips, its check still goes
green. What counts is the review Sourcery wrote of the commit that would be
merged, and only the first line of its body says which kind it is.

Read what the head has:

```bash
head=$(gh pr view <PR> --json headRefOid -q .headRefOid)
gh api repos/{owner}/{repo}/pulls/<PR>/reviews --paginate \
  --jq ".[] | select(.user.login | test(\"sourcery\"; \"i\")) | select(.commit_id == \"$head\")
        | {state, first: (.body | split(\"\n\")[0])}"
gh api repos/{owner}/{repo}/commits/$head/check-runs \
  --jq '.check_runs[] | select(.name | test("sourcery"; "i")) | {conclusion, title: .output.title}'
```

| The head has | It is | Then |
|---|---|---|
| A review starting `Hey - I've reviewed your changes` or `Hey - I've found N issues` | a full review | Passed, once its threads are read |
| A review whose whole body is `### Sourcery assessment` and `**Approved.**` | the quick check | Passed only if nothing but Markdown changed since the last full review; otherwise ask for a full one |
| A review or a `skipped` check starting `Sorry`, or a budget notice | a skip | Blocked; see the causes in `docs/setup/004-sourcery-setup.md` |
| Nothing from Sourcery | no review | Ask for one; do not wait for it to arrive |

To ask for a full review, comment `@sourcery-ai review` on the pull request,
alone. Sourcery sometimes fails to start on a commit, and nothing arrives later
to fix it.

**Read the threads immediately before handing off**, every time. Findings can
arrive after an earlier thread was answered:

```bash
gh api graphql -f query='{ repository(owner: "koodauspaja", name: "treenivihko") {
  pullRequest(number: <PR>) { reviewThreads(first: 100) {
    pageInfo { hasNextPage endCursor }
    nodes { isResolved comments(first: 1) { nodes { path body } } } } } } }' \
  --jq '.data.repository.pullRequest.reviewThreads
        | "hasNextPage=\(.pageInfo.hasNextPage)", (.nodes[] | select(.isResolved | not))'
```

If `hasNextPage` is `true`, page on with `after: "<endCursor>"`, because a
truncated answer reads the same as a clean one. Nothing unresolved may remain:
a finding is fixed, or answered in its thread with the reason it stands, and
then resolved.
