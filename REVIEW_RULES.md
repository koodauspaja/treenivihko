# Review rules

What Sourcery checks on every pull request, and why. The rule text itself is
in [`docs/setup/004-sourcery-setup.md`](docs/setup/004-sourcery-setup.md), the
one copy that is pasted into the dashboard; this file explains it.

**The dashboard is what runs.** A change to a rule changes the dashboard, that
setup document and this file, in one pull request.

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

**Block 1's privacy rule** exists because the repository is public and the
user is a child. The real data is the parent's, and it stays in the database.

**Block 2's AI rule** is the code-level half of "the AI chooses, it never
invents" (`CLAUDE.md`). A model's answer that names an exercise outside the
library, or a value outside its limits, is rejected before anyone sees it.

## What a rule sees

- **Only changed lines.** Block 3 compares a spec and its decision record when
  a pull request changes them together, which a feature's does. Whether
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
| No secrets or personal data in a PR title or description | The author, per `/open-pr` |
| English commit messages | Convention only: a rule reads files, never the commit log |
