# Review rules

What Sourcery checks on every pull request, and why. The rule text itself is
in [`docs/setup/004-sourcery-setup.md`](docs/setup/004-sourcery-setup.md), the
one copy that is pasted into the dashboard; this file explains it.

**The dashboard is what runs.** A change to a rule changes that setup document
and this file in one pull request, and the dashboard by hand once it merges:
until the owner pastes the new text there, Sourcery reviews by the old.

**The rules are few on purpose.** A review rule answers by judgement, so it is
kept for what matters most and what nothing deterministic can check. Whatever
the linter, the type check or the coverage threshold can enforce is left to
them.

## The blocks

| Block | Asks | Paths | Why the paths are these |
|---|---|---|---|
| 1 | No secrets, and no real person's data | `**` | A secret arrives in a workflow or a config file as often as in code, and personal data in a fixture or a doc as often as in source |
| 2 | What a user sees is Finnish, and AI output is checked against the library | `src/**` `.ts` and `.tsx` | Both happen only in the app's code |
| 3 | A decision record matches its spec | `specs/**`, `decisions/**` | The rule compares two documents, so it is shown both |
| 4 | How the repository is run and the app is used, and the risks that need someone it does not have | `**` | Context for every file, since such findings land on workflows, scripts and docs alike |

**Block 1's privacy rule** exists because the repository is public and the
user is a child. The real data is the parent's, and it stays in the database.

**Block 4 is context, not a check.** On the first six pull requests,
13 of the 25 findings answered without a change assumed a second writer, a
fork's pull request, overlapping merges or a retargeted pull request, none of
which this repository has, and they came back in every round
(`decisions/018-sourcery-repository-context.md`). A risk that needs only the
one writer is still reported.

Block 4 also says how the app is used: only this repository's code, the app,
its migrations and its scripts, writes the database, and one parent uses it. On the first three feature pull requests, #46, #48 and
#49, 33 of 57 findings led to a fix and 24 were answered without a change;
14 of the 24 were what Blocks 2 and 4 now say, and 8 of those were a write
by hand, outside that code, or two of the parent's own requests at once
(`decisions/050-sourcery-calibration.md`). A path in that code which skips
its checks, a migration or a script included, is still reported. Four of the 24 were answered at first and fixed
when they came back: three on #46 about such a path, which were right, and
one on #49 about an import's two amounts.

Block 4 also covers a request the parent sends again, by a second click or
after a lost answer. On #55, Feature 004's pull request, 6 of the 33 findings,
in five of its six full reviews, said a repeated add or move applies twice.
Nothing resends a server action on its own, so the repeat is the parent's own
click, in plain sight and one click from undone. 050 counted such a retry among the noise it removed, but
the rule's words covered only two requests at the same instant
(`decisions/056-sourcery-repeated-requests.md`). A repeat that loses data,
half saves it, or whose result cannot be seen is still reported.

**Block 2's AI rule** is the code-level half of "the AI chooses, it never
invents" (`CLAUDE.md`). A model's answer that names an exercise outside the
library, or a value outside its limits, is rejected before anyone sees it. It
is about the app's own calls to the Claude API: on #49, an import the parent
wrote with an AI tool of their own, shown back to them in a refusal, drew 6
findings across two rounds, so the rule says that text is the parent's input.

## What a rule sees

- **Only changed lines.** Block 3 compares a spec and its decision record when
  a pull request changes them together, which a feature's does. A chore's or a
  bug's record has no spec, and the block says not to flag that. Whether
  Sourcery reads the unchanged counterpart on a one-sided edit is not
  established, so the author's self-review in `/open-pr` compares the two
  instead.
- **Never the pull request title or description.** A rule reads files, so
  `/open-pr` has the author read both for secrets and personal data before
  sending them.
- **The app's code under `src/`.** Block 2's paths assume the Next.js project
  keeps its code there. If it ever does not, the block's paths change with it.

## Deliberately not Sourcery rules

| Requirement | Carried by |
|---|---|
| Tests for every feature, edge cases included | The spec's Tests section lists each case, the self-review in `/open-pr` checks that each has a test asserting its outcome, and the 100% coverage threshold, once CI runs it, catches code no test runs |
| English for code, comments and documents | `CLAUDE.md`, as a convention |
| A comment says what the code is for | `CLAUDE.md`, as a convention |
| The spec and decision record named in the PR description | The PR template; a rule cannot see the description |
| No secrets or personal data in a commit message, PR title or description | The author, per `/open-pr` |
| English commit messages | Convention only: a rule reads files, never the commit log |
