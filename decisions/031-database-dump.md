# 031 — A manual database dump, and backups decided later

Overrides one line of `decisions/026-railway.md`, *Consequences*: "No backups
yet. They are a step of their own, before real data goes in."

## Context

The workspace is on Railway's Hobby plan, whose volumes have no backups or
point-in-time recovery (Pro only). The database holds one user row and no
data of the child's yet. The three ways to back it up each cost something: Pro
at $20 a month instead of $5, a nightly `pg_dump` service and bucket of this
repository's own, or an encrypted dump kept on GitHub with a Railway token and
a key to look after.

## Decision

- **No backup infrastructure now.** It is decided with the first feature that
  stores the child's marks or the exercise library, when what it protects and
  how much it is worth is clearer.
- **Until then, a dump by hand**, before any risky migration: `pg_dump`
  inside the Postgres container through `railway ssh`, to a file only the
  parent can read, and `pg_restore` into a scratch local database, whose
  every table's rows are compared with Railway's. Both are in setup 010,
  *Later*.

## Why

| Decision | Why |
|---|---|
| Postponed | There is nothing yet to lose: one user row, which a sign-in recreates |
| Through `railway ssh` | Postgres has no public TCP proxy, and keeps none |
| `--format=custom` | Measured: the binary dump comes through the SSH stream intact, and restored into a scratch database with every table's row count matching Railway's |
| The dump outside the repository, readable only by its owner | It holds personal data and live session tokens, which would let a reader sign in as the parent; `*.dump` is git-ignored as a second guard |
| Written to `.partial`, renamed on success | A failed run must not destroy the last good dump |
| Checked in a scratch database, every table counted | Restoring over the development database can leave its own objects behind, and one table's count can match while another's does not |

## Consequences

- **The first feature that stores the child's data** decides backups before it
  merges, and a restore drill comes with whatever it decides.
- A dump is only as recent as the last time someone ran it.
