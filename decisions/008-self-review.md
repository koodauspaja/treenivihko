# 008 — A self-review before every pull request

## Context

The first pull request reviewed by Sourcery here (#7) took three rounds and 29
findings. Most of them fell into a few repeating classes, which the author
could have caught on the diff in minutes. Each round costs a wait and a
context switch.

## Decision

- **`/self-review` runs before the first push of every pull request**, with
  the `code-review` skill beside it, as step 1 of `/open-pr`. A later push
  repeats it on what changed.
- **The classes are evidence, not advice.** Each comes from a real review:
  the earlier project's measured history, this repository's first Sourcery
  rounds, or one of this app's own rules (personal data, AI output). Each has
  a counter that is an action.
- **What the pass changed is written in the pull request**, so a reviewer
  sees what was checked.

## Why

A rule written down is not a check. The pass makes the checks an explicit
step at the cheapest moment, before anyone else reads the diff.

## Consequences

- The list grows when a review finds a class it does not have, and a class
  that stops appearing can be removed. Once there is npm and enough merged
  pull requests, a script can count review findings by class, as the earlier
  project's does.
