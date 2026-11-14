# 080 — A deadline for the nightly backup

## Context

`decisions/063-database-backups.md` runs the backup as a Railway cron service
that is never restarted. Nothing bounded a run: if Postgres accepted the
connection and then stopped answering, `pg_dump` or the row-count query would
wait forever, and so would an upload that stalled. Railway starts no cron run
while the previous one still runs, so one hung run would skip every night
after it, with nothing to say so until the restore drill found the newest dump
old.

## Decision

- **A run ends after one hour.** `docker/backup/entrypoint.sh` runs
  `backup.sh` under busybox's `timeout -k 60 3600`: a `TERM` at the hour, a
  `KILL` a minute later if it is still there. The run then exits non-zero and
  shows as failed, and the next night runs as usual.
- **The entrypoint shell stays PID 1**, and `timeout` is called from it, not
  `exec`'d and not as `sh -c`'s only command, which the shell would `exec`.
  Busybox's `timeout` becomes the command it runs and leaves the waiting to a
  child, so run as PID 1 the command is PID 1, which ignores a `TERM` it has
  no handler for: measured in the image, a 2-second deadline then let the
  command run its full 30 seconds and exit 0.

## Why

| Decision | Why |
|---|---|
| One deadline for the whole run | It covers every way a run can hang (connecting, dumping, counting, uploading, pruning) with one line, where `statement_timeout` or a connect timeout would each cover one |
| One hour | A run takes seconds today; an hour leaves room for the database to grow many times over and still ends 23 hours before the next night |
| A kill a minute after the `TERM` | A process that ignores `TERM` still ends |
| Ending mid-run is safe | An object appears in the bucket only once its upload completes, and pruning never removes one of the newest 14 (`decisions/063-database-backups.md`) |
| Busybox's `timeout` | It is already in `postgres:18-alpine`, so nothing is added to the image |

## Consequences

- A hung run costs that one night's backup, not the nights after it.
- A run that needs more than an hour fails every night. Today's runs take
  seconds; if a dump ever nears the hour, the deadline is raised here.
- `tests/unit/config/railway.test.ts` fails if the image's entrypoint stops
  being `entrypoint.sh`, if the deadline goes, or if it reaches 23 hours.
- Seen when the backup itself merged: Railway skipped building the backup from
  `main`, with CI green, after a rebase merge whose last commit changed only
  documentation. Railway seems to match its watch patterns against the last
  commit of a push only. A change to `docker/backup/**` that is not in the
  last commit is deployed with `railway redeploy -s backup --yes` once merged.
