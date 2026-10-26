---
name: open-pr
description: Review your own diff, then open the pull request and hand it to a human. Use when the work on a branch is done and its tests pass.
---

# Opening a pull request

1. **Review your own diff before the first push.** Run the `code-review` skill
   at low effort on it, and fix what it finds. Then:
   - **The old words.** When behaviour changed, search `specs/`, `decisions/`,
     comments and tests for the value, the name or the mechanism it replaced.
   - **The edge cases.** Each edge case the spec lists has a test that asserts
     its outcome. Coverage shows a line ran, not that its result was checked.
   - **The other half.** When a spec or a decision record changes without its
     counterpart, read the counterpart and check the two still agree. No
     review rule reliably does this for you.

   A later push repeats these checks on what it changed.
2. **Commit** with a conventional message: `feat: …`, `fix: …`, `chore: …` or
   `docs: …`.
3. **Tick the issue's boxes** (Acceptance criteria always, and Scope where the
   template has it) before the pull request opens. A box is ticked when its
   outcome is verified. One that cannot be ticked honestly says so on the box:

   ```
   - [ ] The criterion — **not ticked: why**
   ```

   A criterion that resists ticking usually means something was missed.
4. **Check the size**: `git diff origin/main...HEAD | wc -c`. Sourcery skips a
   pull request over 150,000 characters, so stay well under it, and otherwise
   split the work into pull requests merged one after another.
5. **Push and open the pull request** against `main`, filling in
   `.github/PULL_REQUEST_TEMPLATE.md`:
   - `Closes #N` on the first line. Only a closing keyword links the pull
     request to its issue.
   - The spec and the decision record, or `Not applicable` with the work type.
   - The summary, and what a reviewer should check.
   - The Checklist's self-review box, with what step 1 changed or "nothing
     found". Leave a box unticked when it is not true.

   **Read the title and the body before sending them.** They are public the
   moment the pull request opens, and no review rule sees them: no secret, and
   no real person's data.
6. **Move the card to `In Review`.** Opening the pull request moves it to
   `In Progress` on its own, so this step moves it on.
7. **Pass the Sourcery gate** (below) and fix what the review finds: every
   finding of a round in one commit, never a push per finding. The gate is
   then passed again on the new head.
8. **Hand it to the human.** Never merge on your own initiative. Merge when a
   human says to, quoting what they said.

## The Sourcery gate

**A green check is not a review.** When Sourcery skips, its check still goes
green. What counts is the review Sourcery wrote of the commit that would be
merged, and only the first line of its body says which kind it is.

Read what the head has:

```bash
head=$(gh pr view <PR> --json headRefOid -q .headRefOid)
gh api repos/{owner}/{repo}/pulls/<PR>/reviews --paginate \
  --jq ".[] | select(.user.login == \"sourcery-ai[bot]\" and .user.type == \"Bot\")
        | select(.commit_id == \"$head\" and .state != \"DISMISSED\")
        | {login: .user.login, state, first: (.body | split(\"\n\")[0])}"
gh api repos/{owner}/{repo}/commits/$head/check-runs \
  --jq '.check_runs[] | select(.app.slug | test("sourcery"; "i")) | {app: .app.slug, conclusion, title: .output.title}'
```

Only Sourcery's own app account counts, and a dismissed review is not a
review.

| The head has | It is | Then |
|---|---|---|
| A review starting `Hey - I've reviewed your changes` or `Hey - I've found N issues` | a full review | Passed, once its threads are read |
| A review whose whole body is `### Sourcery assessment` and `**Approved.**` | the quick check | Passed if every commit since the last full review is low risk (below); otherwise ask for a full one |
| A review or a `skipped` check starting `Sorry`, or a budget notice | a skip | Blocked; see the causes in `docs/setup/004-sourcery-setup.md` |
| Nothing from Sourcery | no review | Ask for one; do not wait for it to arrive |

To ask for a full review, comment `@sourcery-ai review` on the pull request,
alone. Sourcery sometimes fails to start on a commit, and nothing arrives later
to fix it.

### Does a fix need a fresh review?

Every commit after the first full review gets a risk level. Claude decides it,
and says it in a pull request comment naming the commit, the level and why, so
the call is visible:

| Level | The commit changes | Review |
|---|---|---|
| **Low** | Documentation, comments, formatting; a rename that changes no behaviour; a test-only change that does not weaken a test; a small copy fix; a small UI adjustment such as spacing or a label | The quick check is enough |
| **High** | Business logic: building or adapting a program, the AI call and its library check, progress and marks. Anything that writes data. Sign-in and access, including the passcode. A migration. Secrets or personal data. A big UI change: a new screen or flow, a restructured layout, a changed navigation | Ask for a fresh full review |

**In doubt, it is high.** A commit holding both kinds is high.

### At most three rounds

A round is one full review: the one on opening is the first. Batching every
finding of a round into one commit keeps the count down. If a third round
still has findings, fix what is clear, answer the rest in their threads with
the reason, and hand the pull request over with a comment saying so, rather
than asking for a fourth.

### Before handing off

Immediately before handing off, every time: read the head again and pass the
gate on it, then read the threads. A push or a finding can arrive after the
last look.

```bash
repo=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')
gh api graphql -F owner="${repo%/*}" -F name="${repo#*/}" -F pr=<PR> -f query='
  query($owner: String!, $name: String!, $pr: Int!, $after: String) {
    repository(owner: $owner, name: $name) { pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { id isResolved comments(first: 1) { nodes { path body } } } } } } }' \
  --jq '.data.repository.pullRequest.reviewThreads
        | "hasNextPage=\(.pageInfo.hasNextPage) endCursor=\(.pageInfo.endCursor)",
          (.nodes[] | select(.isResolved | not))'
```

If `hasNextPage` is `true`, run it again with `-F after=<endCursor>`, because
a truncated answer reads the same as a clean one. Nothing unresolved may
remain. Each finding is one of:

- **Fixed**, in the round's commit.
- **Answered**, in its thread, with the reason it stands.
- **Moved to its own issue**, when it is valid but belongs to later work:
  reply `@sourcery-ai issue` in its thread, then give the new issue its kind
  label and Issue Type (`/start-work`), since Sourcery sets neither.

Then resolve the thread.

`@sourcery-ai dismiss` on the pull request dismisses all of Sourcery's reviews,
and `@sourcery-ai review` after it starts fresh. It is for a pull request
whose old findings no longer apply, such as after a rewrite. It does not reset
the count of rounds.
