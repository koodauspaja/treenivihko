# 025 — A migration main already has never changes

## Context

`CLAUDE.md` and setup 009 say an applied migration is never edited: a
database runs each migration once, so an edit reaches fresh databases and
never the ones it already ran on, and the two drift apart unseen. With the
first migration applied on Railway, nothing enforced the rule.

## Decision

- **`npm run db:check-history -- <ref>`** compares `drizzle/migrations` in
  the working tree with the same folder at `<ref>`, `origin/main` by default.
  Every file there must be here and unchanged: each `.sql` file and snapshot
  byte for byte, and the journal's existing entries in the same order, with
  new ones only after them. New migrations pass.
- **CI runs it on every pull request**, in the unit job, against the pull
  request's base branch, so it sits behind a check `main` already requires.
- **The rule is a pure function**, `scripts/migration-history-plan.ts`, unit
  tested; the script around it only reads files and sets the exit code.

## Why

| Decision | Why |
|---|---|
| Against the base branch's tip, not a merge base | "A migration `main` has" is exactly the rule, and the tip needs no history: CI fetches one commit |
| A missing file fails | Deleted, renamed and left behind look the same from here; each is wrong, and the message says to rebase or restore |
| The journal by entry, not by text | drizzle-kit rewrites the whole file when it appends an entry |
| A journal that cannot be read fails, on either side | A check that cannot classify its input does not pass it |

## Consequences

- **In CI a branch behind `main` is not caught by this check**: the pull
  request's checkout is its merge into `main`, which carries `main`'s
  migrations. `main`'s ruleset requires a branch to be up to date, which
  catches it instead; run locally, on the branch itself, the check says so.
- **A wrong migration on `main` is fixed by a new one**, never by editing it.
