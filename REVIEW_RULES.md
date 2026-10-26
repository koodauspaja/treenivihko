# Review rules

What Sourcery checks on every pull request, and why. The rule text itself is
in [`docs/setup/004-sourcery-setup.md`](docs/setup/004-sourcery-setup.md), the
one copy that is pasted into the dashboard; this file explains it.

**The dashboard is what runs.** A change to a rule changes the dashboard, that
setup document and this file, in one pull request.

## The blocks

| Block | Asks | Paths | Why the paths are these |
|---|---|---|---|
| 1 | A decision record matches its spec | `specs/**`, `decisions/**` | The rule compares two documents, so it is shown both |
| 2 | What a user sees is Finnish | `src/**` `.ts` and `.tsx` | User-facing strings live only in the app |
| 3 | A feature is tested, edge cases included | `src/**`, `tests/**` (`.ts` and `.tsx`), `specs/**` | The edge cases are listed in the spec, so the spec is in scope; `*.ts` alone would miss every component test |
| 4 | No secrets, and no real person's data | `**` | A secret arrives in a workflow or a `.toml` as often as in code, and personal data in a fixture or a doc as often as in source |
| 5 | Everything but user-facing copy is English | `**` | Any list of directories lets `docs/`, `.claude/` or `.github/` fall through |
| 6 | A comment says what the code is for | `src/**`, `scripts/**`, `tests/**` | Where code comments are |
| 7 | AI output is checked against the library | `src/**` `.ts` and `.tsx` | The app's code is where the answer is used |

Each block has one subject, so its paths can stay matched to it. Sourcery
recommends fewer than three rules per block.

**Block 4's privacy rule** exists because the repository is public and the
user is a child. The parent owns the real data, and it stays in the database.

**Block 7** is the code-level half of "the AI chooses, it never invents"
(`CLAUDE.md`). A model's answer that names an exercise outside the library, or
a value outside its limits, is rejected before anyone sees it.

## What a rule sees

- **Only changed lines.** Block 1 compares a spec and its decision record when
  a pull request changes them together, which a feature's does. Whether
  Sourcery reads the unchanged counterpart on a one-sided edit is not
  established, so that case counts as unchecked.
- **Never the pull request description.** A rule reads files.

## Deliberately not Sourcery rules

- **The spec and decision record named in the PR description.** A rule cannot
  see the description. The PR template and `CLAUDE.md` carry it.
- **English commit messages.** A rule reads files, never the commit log.
  Convention only, and named as such rather than left looking enforced.
- **Whatever the toolchain can check.** A rule answers by judgement. Once the
  linter and the tests exist, anything they can express moves to them and out
  of here; review rules are kept for what no deterministic check reaches.
