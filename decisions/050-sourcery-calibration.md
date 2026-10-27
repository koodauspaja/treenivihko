# 050 — Telling Sourcery how the app is used

Issue: #50. Adds to `decisions/018-sourcery-repository-context.md`, which
told Sourcery how the repository is run.

## Context

018 said to measure again after a few more pull requests. The first three
feature pull requests, #46, #48 and #49, are the first with the app's own
code. Each finding is sorted by the first word of the reply that settled its
thread: **Fixed**, or **Stands** and **Answered** for no change.

## The measurement

| Pull request | Findings | Led to a fix | Answered, no change |
|---|---|---|---|
| #46, the library's data | 30 | 20 | 10 |
| #48, the library's pages | 4 | 3 | 1 |
| #49, the import | 23 | 10 | 13 |
| **All** | **57** | **33** | **24** |

Of the 24 answered without a change:

| Kind | Count | Where |
|---|---|---|
| A write by hand, outside the repository's code, by whoever holds the database's credentials | 4 | #46 |
| Text the parent pasted, read as the app's AI output by Block 2 | 6 | #49, three in each of two rounds |
| Two of one parent's own requests at the same instant, or a retry after a lost answer | 4 | #46, #49 |
| A path inside the app that skipped `readExercise`, answered and later fixed | 3 | #46 |
| An import's two amounts, answered and later fixed | 1 | #49 |
| One-off disagreements, one of them wrong | 6 | #48, #49 |

**The first three kinds, 14 of the 24, are what the rules did not say.** One
of the four in the third kind, an import and a rename deadlocking, was fixed
when it came back, though its worst outcome was an error page. The three on
#46 about a path inside the app were right: the store then took only a
`CheckedExercise`, which the rules alone make.

## Decision

- **Block 2's AI rule says what it is about**: the app's own calls to the
  Claude API. Text the parent pastes or uploads is the parent's input, and
  showing it back to them in a refusal is not a finding.
- **Block 4 says how the app is used**: the database is written only by this
  repository's code, the app, its migrations and its scripts. A write by hand,
  outside that code, is not reported, while a path in that code which skips
  its checks still is, a migration or a script included. One parent uses the app, so a race
  between their own requests is reported only when it can lose data or leave
  it half saved.
- **The profile stays Balanced**, as the owner decided, and as 018 found:
  Quiet keeps only the highest-priority comments, and most findings that led
  to a fix were Medium, the lone surrogate on #49 among them.
- **The text is in `docs/setup/004-sourcery-setup.md`**, the one copy pasted
  into the dashboard, and `REVIEW_RULES.md` says why.

## Why

| Decision | Why |
|---|---|
| Say how the app is used rather than narrow what is looked at | As in 018, the waste was the same few kinds, each answered once and raised again; telling Sourcery the facts removes them without turning off what found the 33 |
| Keep every path in the repository's code in scope | On #46 a path inside the app was the finding that mattered most, and it was answered wrongly twice before it was fixed; a migration or a script such as `trainer:set-password` writes the same data, and is the repository's code as much |
| Report a race when it can lose data or half save it | Those are worth a finding even between one parent's own requests; a refusal or an error page that the next try settles is not. Two saves of one exercise at once already lose the earlier edit, as Feature 002's spec decided (the later one wins), so such a finding is reported, and answered by that spec |
| Not Quiet | It cuts by priority, not by kind, and the real catches and the noise share a priority |

## Consequences

- **The change does nothing until the owner pastes Block 2 and Block 4 into
  Sourcery's dashboard.** The pull request that merges this cannot show it.
- **If anything besides the repository's code ever writes the database**, or
  the app gets a second user who works at the same time, Block 4 is wrong and
  must be rewritten first.
- **To measure again**, after the next feature pull requests: sort each
  finding as above, and check that the three kinds are gone and that a real
  gap, such as #49's lone surrogate, is still found.
