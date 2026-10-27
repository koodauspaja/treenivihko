# 018 — Telling Sourcery how the repository is run

## Context

`decisions/006-sourcery-review.md` set three review rule blocks and a Balanced
review profile, and said to revisit them once there was code. After six pull
requests, each of Sourcery's findings had been settled in its thread, and the
first word of the settling reply says how: **Fixed** (or Done, Valid, Right),
**Stands**, **Not the case**, or **Accepted** for a licence.

## The measurement

Licence findings left out: 28, all on sharp's libvips, accepted and since
ignored in Sourcery (`decisions/012-project-init.md`).

| Pull request | Findings | Led to a fix | Answered, no change | Wrong |
|---|---|---|---|---|
| #7, review rules and gate | 29 | 21 | 6 | 2 |
| #9, self-review skill | 9 | 4 | 3 | 2 |
| #11, branch protection | 21 | 13 | 5 | 3 |
| #13, Next.js app | 11 | 9 | 2 | 0 |
| #15, Node pin | 2 | 2 | 0 | 0 |
| #17, CI and SonarCloud | 19 | 9 | 9 | 1 |
| **All** | **91** | **58** | **25** | **8** |

#17's count includes a finding that resolved itself on the next push, "SonarCloud
rejects overlapping files", which was right: it named the double indexing that
then broke the scan. #17's one wrong finding was applied, and reverted when
the scan failed.

Of the 25 answered without a change, **13 assumed someone the repository does
not have**: a second person with write access, a fork's pull request,
overlapping merges to `main`, or a pull request retargeted from another branch.
One on #9, three on #11, nine on #17, and on #17 most came back in every
round. The other 12 were one-off disagreements of substance.

Of the 58 that led to a fix, 46 were Medium; the self-resolving one on #17
was Critical.

## Decision

- **A fourth rule block, on `**`, that is context, not a check**: one writer,
  every pull request against `main` from this repository, merged one at a
  time; risks that need a second writer, a fork, overlapping merges or a
  retargeted pull request are not reported. Text in
  `docs/setup/004-sourcery-setup.md`. Adds to `decisions/006-sourcery-review.md`,
  which had three blocks.
- **The profile stays Balanced.** Quiet keeps only the highest-priority
  comments, and most of what led to a fix was Medium.
- **The rest stays as it is**: the three blocks, the risk levels and the three
  rounds.

## Why

The waste was not in how much Sourcery said but in what it kept saying: the
same handful of risks, each needing someone who is not here, answered once and
raised again in the next round. Telling it the facts removes those without
narrowing what it looks for.

## Consequences

- A real risk that needs only the one writer is still reported.
- If the repository ever gains a second writer, Block 4 is wrong and must be
  removed or rewritten before that person's first pull request.
- To measure again, after a few more pull requests: for each, read every review
  thread and sort it by the first word of the last reply that is not
  Sourcery's.

  ```bash
  gh api graphql -F pr=<PR> -f query='query($pr: Int!) {
    repository(owner: "koodauspaja", name: "treenivihko") { pullRequest(number: $pr) {
      reviewThreads(first: 100) { nodes { comments(first: 20) { nodes { author { login } body } } } } } } }' \
    --jq '.data.repository.pullRequest.reviewThreads.nodes[]
          | ([.comments.nodes[] | select(.author.login != "sourcery-ai") | .body] | last // "")
          | split(" ")[0]'
  ```
