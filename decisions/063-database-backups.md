# 063 — Nightly backups to a Railway bucket

Overrides three lines:

- `decisions/031-database-dump.md`, *Decision*: "No backup infrastructure
  now." There is now.
- `decisions/f006-session-marks.md`, *Why*: "No backups, for now". The manual
  dump it kept stays, beside the nightly backup.
- `decisions/026-railway.md`, *Consequences*: "Every apply also redeploys the
  service from `main`." The apply that created the backup and its bucket left
  the web service's deployment as it was: an apply redeploys the services
  whose settings it changes.

## Context

Since Feature 006 the database holds the child's marks, which nothing
recreates. Railway's volume backups are on Pro only, and the parent pays for no
plan above Hobby. `decisions/031-database-dump.md` weighed two other ways: a
nightly `pg_dump` service writing to a bucket, or an encrypted dump kept on
GitHub. GitHub turns off a public repository's scheduled workflows after 60
days without activity, without a word, and its artifacts would be public
behind a key that also has to be kept safe. Railway's buckets are on Hobby, at
$0.015 per GB-month.

## Decision

- **A cron service, `backup`, runs at 01:00 UTC** and exits. It dumps Postgres
  with `pg_dump --format=custom` over Railway's private network, uploads the
  dump to the bucket `backups`, then removes all but the newest 14 dumps.
- **Its image is `docker/backup/Dockerfile`**: Postgres's own Alpine image
  with the AWS CLI added, running as `postgres`. It rebuilds on a change to
  `docker/backup/**` only, from `main`, after CI.
- **The bucket is private, in the same Railway project**, and is only
  reached with the credentials Railway shows the workspace's members.
  The dump is not encrypted on top of that.
- **Each run logs every table's row count**, from the query in
  `docker/backup/row-counts.sql`, so the restore drill compares the restored
  dump with Railway's data as it was that night.
- **The manual dump of setup 010 stays**, for before a risky migration, when
  last night's backup is a day old.

## Why

| Decision | Why |
|---|---|
| A bucket on Railway | No new account or key, and the database never leaves Railway's network on the way to it |
| Amsterdam | The bucket region nearest to `europe-west4`, which is in the Netherlands too |
| Pruned by count, not by age | A night that takes no new dump removes none, so a fortnight of failures still leaves 14 good dumps |
| Nothing removed before the upload completes | An object appears only once its upload is whole, and the script stops at the first failure |
| A restored copy signs everyone out | It holds that night's sessions, those signed out since included, and a trainer unlock goes with its session |
| The restore swaps in one transaction | An interrupted or refused rename renames neither database, so the app never finds `railway` missing |
| No encryption on top | It would add a key that, lost, takes every backup with it; the bucket is already readable only by the workspace's members, and the workspace has one |
| Not retried | A failed night shows as failed, and the next night runs as usual |
| Postgres's own image | `pg_dump` refuses a server newer than itself, so the image's major is never below Railway's; a unit test fails when it is |
| Row counts in the log, not the bucket | The bucket then holds only dumps, and the log carries names and numbers, never a row |

## Consequences

- A backup is at most a day old. Point-in-time recovery stays out of reach.
- The backups live in the same Railway project as the database. They cover a
  bad migration or a lost volume, not the loss of the Railway account or an
  apply that deletes the project's resources.
- The image is as recent as its last build, which only a change to
  `docker/backup/**` starts. Nothing reaches the container from outside, and
  it runs for seconds a night.
- Nothing announces a failed night: it shows only in the service's
  deployments. Running the restore drill now and then is what shows that
  backups still arrive and still restore.
- `.railway/railway.ts` declares the bucket, so an apply never deletes it,
  and `tests/unit/config/railway.test.ts` fails if the declaration goes.
- The restore drill and how to restore are in `docs/setup/012-backups.md`.
