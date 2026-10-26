# 005 — Branch protection

## Goal

A change reaches `main` only through a pull request, after its required checks,
with linear history. Nobody can force-push to `main` or delete it.

This project: one ruleset named `main`, on the default branch. There is no
release branch, since there is one environment.

---

## Step 1 — Create the ruleset

Repository → **Settings** → **Rules** → **Rulesets** → **New branch ruleset**,
or from the command line: save the JSON below as `ruleset-main.json`, then

```bash
gh api repos/<your-org>/<your-repo>/rulesets -X POST --input ruleset-main.json
```

| Setting | Value | Why |
|---|---|---|
| Target | the default branch (`~DEFAULT_BRANCH`) | Feature branches stay free to rebase and force-push |
| Bypass list | empty | The rules hold for administrators too |
| Restrict deletions | on | |
| Block force pushes | on | |
| Require linear history | on | `main` reads as one line of the work's own commits |
| Require a pull request | on, **0** approvals | One person works here, and GitHub does not let an author approve their own pull request. The human gate is the merge itself, which the ruleset cannot enforce: anyone with write access can merge, Claude Code included, so the rule that Claude merges only when told to is in `CLAUDE.md` |
| Dismiss stale approvals on push | on | Inert at 0 approvals; right if approvals are ever required |
| Require conversation resolution | on | The one part of reading the threads that GitHub can enforce |
| Allowed merge methods | rebase, squash | Rebase keeps each commit's message; squash is there for a branch whose commits are not worth keeping |
| Require status checks | `Sourcery review` (app `sourcery-ai`), branch up to date | See Step 3 |

The ruleset as JSON:

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["rebase", "squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [ { "context": "Sourcery review", "integration_id": 48477 } ] } }
  ]
}
```

`48477` is the Sourcery app's id, so a check of the same name from anything
else does not count. A check's name appears only after it has run on a
pull request at least once.

## Step 2 — Repository merge settings

Repository → **Settings** → **General** → **Pull Requests**:

- **Allow merge commits**: off, matching the ruleset
- **Allow squash merging** and **Allow rebase merging**: on
- **Automatically delete head branches**: on

```bash
gh api repos/<your-org>/<your-repo> -X PATCH \
  -F allow_merge_commit=false -F allow_rebase_merge=true \
  -F allow_squash_merge=true -F delete_branch_on_merge=true
```

## Step 3 — What the required check does not do

GitHub counts a required check as satisfied when it is `success`, `skipped` or
`neutral`. Sourcery reports `skipped` when it declines a review: over the size
cap, out of budget, or past its re-review limit. **So a green merge box is not
proof that Sourcery reviewed anything.** The required check catches an outright
failure and makes the expectation visible; the gate in
`.claude/skills/open-pr/SKILL.md`, which reads the review itself, is still what
decides.

When CI and SonarCloud exist, their checks are added here. A required check
that stops reporting, for example after a job is renamed, blocks every merge
until the ruleset names the new check, so a rename updates the ruleset in the
same pull request.

## Step 4 — Verify

Read back what applies to `main`. Not `branches/main/protection`, which covers
only classic branch protection and answers 404 for a ruleset:

```bash
gh api repos/<your-org>/<your-repo>/rules/branches/main \
  --jq '.[] | .type + " " + ((.parameters // {}) | tostring)'
gh api repos/<your-org>/<your-repo>/rulesets \
  --jq '.[] | select(.name == "main") | {enforcement, target}'
```

The first lists `deletion`, `non_fast_forward`, `required_linear_history`,
`pull_request` and `required_status_checks`, each with its settings: compare
them with the table in Step 1, the check's name and app id included. The
second says `active` on `branch`.

**Only if that lists all five**, try a direct push. If the ruleset were not in
force, this push would land on `main` and could only be taken back with a pull
request, so the read-back comes first. The commit sits on the remote's latest
`main`, so a rejection cannot come from a stale base instead of the ruleset,
and on no branch, so nothing is left behind locally:

```bash
git fetch origin main &&
  git switch --detach origin/main &&
  git commit --allow-empty -m "test: direct push to main should be rejected" &&
  git push origin HEAD:main
# remote: - Changes must be made through a pull request.
git switch -
```

The `&&` matter: if the fetch or the switch fails, nothing is committed on the
current branch and nothing is pushed.

---

## Done when

- [ ] The ruleset `main` is active, with the rules in Step 1
- [ ] Merge commits are off, and head branches are deleted on merge
- [ ] A direct push to `main` is rejected

## Next

→ `006`, the Next.js project, once it is written.
