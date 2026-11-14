# 012 — Database backups

## Goal

Every night at 01:00 UTC, Railway's cron service `backup` dumps Postgres into
the private bucket `backups`, and keeps the newest 14. Both are declared in
`.railway/railway.ts`, and the image is `docker/backup/`. Why it is built this
way: `decisions/063-database-backups.md`. What now runs:
`docs/infrastructure.md`.

**A backup holds personal data and live session tokens**: anyone who can read
one can sign in as the parent until those sessions end. The bucket answers
only to its credentials. The commands below stream a dump straight into
Postgres and write none to disk; never copy one where someone else can read
it.

---

## Step 1 — The bucket and the service

On a project created from the file by setup 010, they already exist. On one
created before:

```bash
railway config plan     # 2 to add: bucket backups and service backup. Nothing else
railway config apply
railway config plan     # "already up to date"
```

If the second plan shows `Update backup source.checkSuites`, apply once more:
the first apply creates the service without Wait for CI, and only a second one
sets it.

The service builds from `main`. Before `docker/backup/Dockerfile` is on `main`
its build fails, and `railway up -s backup` deploys the working tree instead.

## Step 2 — The first backup

The first runs at 01:00 UTC, or a few minutes after: Railway starts a cron
run within minutes of its time. To run one now:

```bash
railway restart -s backup --yes
railway logs -s backup --lines 40
```

The log has a `row count:` line for each table, then
`uploaded: treenivihko-<UTC time>.dump, <size> bytes`. A run that fails shows
as crashed in the service's deployments, and so does one still running after
an hour, which is stopped. Railway then emails the workspace's members
"Deploy Crashed" for the service `backup`: keep the deployment notifications
on in Railway's account settings, where they are on by default. One whose
dump, counts or upload fails removes nothing from the bucket; one that fails
while removing old dumps may have removed some of them, never one of the
newest 14.

## Step 3 — The restore drill

It restores a dump into a scratch local database and compares every table's
rows with those its run logged that night. It needs Docker, `jq`, and the
local Postgres of setup 009 (`npm run db:up`).

Set up the shell, from the repository root:

```bash
docker build -q -t treenivihko-backup -f docker/backup/Dockerfile .
creds=$(railway bucket credentials --bucket backups --json)
export AWS_ACCESS_KEY_ID=$(jq -r .accessKeyId <<<"$creds")
export AWS_SECRET_ACCESS_KEY=$(jq -r .secretAccessKey <<<"$creds")
export AWS_ENDPOINT_URL=$(jq -r .endpoint <<<"$creds")
export AWS_DEFAULT_REGION=$(jq -r .region <<<"$creds")
bucket=$(jq -r .bucketName <<<"$creds")
unset creds
s3() {
  docker run --rm -i -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
    -e AWS_ENDPOINT_URL -e AWS_DEFAULT_REGION --entrypoint aws treenivihko-backup "$@"
}
# The row counts logged straight before the named dump's upload line, or
# nothing, so that a run without counts never borrows an earlier run's.
# Railway keeps logs per deployment, and a redeploy starts a new one, so the
# last 10 deployments' logs are read.
logged() {
  railway deployment list -s backup --limit 10 --json | jq -r '.[].id' |
    while read -r id; do railway logs -s backup --lines 400 "$id"; echo; done |
    awk -v up="uploaded: $1," '
      /^row count: / { rows[++n] = substr($0, 12); next }
      index($0, up) == 1 { for (i = 1; i <= n; i++) print rows[i] }
      { n = 0 }'
}
db() { docker compose exec -T postgres "$@"; }
s3 s3 ls "s3://$bucket/"
```

The newest dump in the list should be from last night's run. An older one
means the nights since did not run, and a night Railway never started sends no
email: look at the service's deployments. Pick a dump from the list, one of
the last few nights so its run is still in Railway's logs, and restore it:

```bash
key=treenivihko-<UTC time>.dump
db psql -q -U postgres -c 'drop database if exists restore_check' &&
  db psql -q -U postgres -c 'create database restore_check' &&
  s3 s3 cp "s3://$bucket/$key" - |
  db pg_restore -U postgres --no-owner --exit-on-error -d restore_check &&
  want=$(logged "$key") && [ -n "$want" ] &&
  have=$(db psql -U postgres -d restore_check --no-psqlrc -v ON_ERROR_STOP=1 -tA -F ' ' \
    < docker/backup/row-counts.sql) &&
  diff <(printf '%s\n' "$want") <(printf '%s\n' "$have") &&
  echo 'every table matches'
ok=$?
db psql -q -U postgres -c 'drop database restore_check'
[ "$ok" -eq 0 ]
```

It prints `every table matches`, and only when the run's logged counts were
found and the restored copy's were counted; it then exits 0, and otherwise
not, even when the scratch database's drop succeeds. Anything else is a
backup that does not restore, or a run whose log is gone; try a more recent
dump before trusting any.

## Restoring

When the live database has to go back to a night's backup. Every row written
since that night is lost, so first look at what the backup holds: run the
drill's block up to `ok=$?`, look in `restore_check`, then run the rest. Two
things to know before starting:

- **The redeploy at the end runs every migration newer than the backup.** If
  one of them is why you are restoring, stop here: it would run again on the
  restored data. It has to be dealt with on `main` first.
- **Until the redeploy is up, the running version serves the restored data.**
  A backup older than a migration can make its pages fail in between, so
  restore when nobody is using the app.

In the drill's shell, restore the dump into a new database on Railway's
Postgres, beside the live one, and check it the same way. A `restored` left
by a failed attempt is dropped first; after a swap, there is none:

```bash
rdb() { railway ssh -s Postgres -- "$@"; }
rdb psql -q -U postgres -c 'drop database if exists restored' &&
  rdb psql -q -U postgres -c 'create database restored' &&
  s3 s3 cp "s3://$bucket/$key" - |
  rdb pg_restore -U postgres --no-owner --exit-on-error -d restored &&
  want=$(logged "$key") && [ -n "$want" ] &&
  have=$(rdb psql -U postgres -d restored --no-psqlrc -v ON_ERROR_STOP=1 -tA -F ' ' \
    < docker/backup/row-counts.sql) &&
  diff <(printf '%s\n' "$want") <(printf '%s\n' "$have") &&
  echo 'every table matches'
```

Sign everyone out of the restored copy. It holds that night's sessions,
those signed out since included, and deleting them deletes their trainer
unlocks with them:

```bash
rdb psql -q -U postgres -d restored -v ON_ERROR_STOP=1 -c 'delete from session'
```

Then swap the two in one transaction, so that it either renames both or
neither, and redeploy only once it has. Postgres allows `alter database …
rename` inside a transaction, unlike `create` and `drop database`:

```bash
rdb psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL' &&
begin;
select pg_terminate_backend(pid) from pg_stat_activity where datname = 'railway';
alter database railway rename to railway_before_restore;
alter database restored rename to railway;
commit;
SQL
  railway redeploy -s treenivihko --yes
```

If a rename fails, nothing has been renamed and nothing redeploys. When
something connected in between, run the block again. When
`railway_before_restore` is still there from an earlier restore, decide about
it first: drop it, or rename it, then run the block again. Once it has run,
check `/api/health`, sign in, and look at the child's latest marks.
The old database stays as `railway_before_restore`, with the same data and
the same care, until you drop it:

```bash
rdb psql -q -U postgres -c 'drop database railway_before_restore'
```

---

## Done when

- [ ] `railway config plan` reports the configuration up to date
- [ ] A night's scheduled run logs `uploaded:` with its dump
- [ ] Railway's deployment notifications are on, by email, in the account's settings
- [ ] The restore drill prints `every table matches` for that dump
- [ ] Without credentials, the bucket answers `403`:
      `curl -s -o /dev/null -w '%{http_code}' "https://$bucket.${AWS_ENDPOINT_URL#https://}/"`

## Next

→ The features, starting with Feature 002, the exercise library.
