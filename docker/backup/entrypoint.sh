#!/bin/sh
# Runs the night's backup with a deadline, so a run that hangs ends as failed
# instead of blocking the nights after it: Railway starts no cron run while the
# last one still runs. The shell stays PID 1, and busybox's timeout is not
# exec'd: it becomes its command, and as PID 1 that ignores the TERM.
#
# decisions/063-database-backups.md
# decisions/080-backup-deadline.md
set -eu

# One hour, then a kill a minute later; a night's run takes seconds.
timeout -k 60 3600 sh /usr/local/lib/backup/backup.sh
