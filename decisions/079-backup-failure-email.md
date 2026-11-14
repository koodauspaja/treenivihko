# 079 — Railway's email when a backup fails

Overrides two lines:

- `decisions/063-database-backups.md`, *Consequences*: "Nothing announces a
  failed night: it shows only in the service's deployments." Railway's email
  does.
- `decisions/080-backup-deadline.md`, *Consequences*: "Railway seems to match
  its watch patterns against the last commit of a push only." The next merge
  disproved it: its last commit changed only a test, and Railway built the
  backup from `main`. Why the first merge's build was skipped is not known, so
  a merge that changes `docker/backup/**` is followed by a look at the
  service's deployments, and a skipped build is redeployed by hand.

## Context

A failed backup run showed only in the service's deployments, and nobody looks
there without a reason. Two ways to hear of it were weighed: Railway's own
notifications, or an external watchdog pinged after every upload, which emails
when no ping arrives in about a day. The watchdog also catches a run Railway
never starts, which its forums report now and then, but it needs an account of
its own and a secret URL on Railway.

## Decision

- **A failed backup is reported by Railway's email.** A run that exits
  non-zero ends `CRASHED`, and Railway sends the workspace's members a
  `Deployment.crashed` notification, by email and in its dashboard. A build
  that fails sends `Deployment.failed` the same way.
- **Nothing is configured for it.** The workspace has no notification rules;
  these are Railway's defaults, and an account turns them off in its
  notification settings. Setup 012 says to keep them on.
- **Checked by breaking one run on purpose:** the backup's `DATABASE_URL`
  pointed at a host that does not exist, a hand run crashed with `pg_dump`'s
  error, and Railway's API lists the email as sent. `railway config apply` then
  set the variable back to its reference, and a hand run uploaded a dump.

## Why

| Decision | Why |
|---|---|
| Railway's email, not a watchdog | No new account, secret or code, and it covers what fails most: a dump, count or upload that fails, or a build |
| Nothing declared | Railway's defaults already email; a rule in the API would be state outside `.railway/railway.ts` |
| Tested on the live service | Whether a cron run's failure emails could only be seen there; the run read and uploaded nothing, and the bucket and database were not touched |

## Consequences

- A night whose run fails emails the parent the same night.
- A run that hangs sends nothing for up to an hour: then the deadline of
  `decisions/080-backup-deadline.md` stops it, and it crashes and emails like
  any other failure.
- A run Railway never starts sends nothing. The restore drill's list of dumps
  shows it: its newest should be from last night, so running the drill now
  and then stays the check.
- The email's subject says "Deploy Crashed", the same as a web service crash;
  it names the service, `backup`.
- An account that turns off its deployment notifications turns this off too.
