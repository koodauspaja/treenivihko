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
as failed in the service's deployments, and removes nothing from the bucket.

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
# The row counts a run logged just before uploading the named dump.
logged() {
  railway logs -s backup --lines 400 | awk -v up="uploaded: $1," '
    /^row count: / { if (!run) n = 0; run = 1; rows[++n] = substr($0, 12); next }
    index($0, up) == 1 { for (i = 1; i <= n; i++) print rows[i] }
    { run = 0 }'
}
db() { docker compose exec -T postgres "$@"; }
s3 s3 ls "s3://$bucket/"
```

Pick a dump from the list, one of the last few nights so its run is still in
the log, and restore it:

```bash
key=treenivihko-<UTC time>.dump
db psql -q -U postgres -c 'drop database if exists restore_check' &&
  db psql -q -U postgres -c 'create database restore_check' &&
  s3 s3 cp "s3://$bucket/$key" - |
  db pg_restore -U postgres --no-owner --exit-on-error -d restore_check &&
  diff <(logged "$key") \
    <(db psql -U postgres -d restore_check --no-psqlrc -tA -F ' ' < docker/backup/row-counts.sql) &&
  echo 'every table matches'
db psql -q -U postgres -c 'drop database restore_check'
```

It prints `every table matches`. Anything else is a backup that does not
restore, or a run whose log is gone; try a more recent dump before trusting
any.

## Restoring

When the live database has to go back to a night's backup. Every row written
since that night is lost, so first look at what the backup holds, in the
drill's `restore_check`.

In the drill's shell, restore the dump into a new database on Railway's
Postgres, beside the live one, and check it the same way:

```bash
rdb() { railway ssh -s Postgres -- "$@"; }
rdb psql -q -U postgres -c 'create database restored' &&
  s3 s3 cp "s3://$bucket/$key" - |
  rdb pg_restore -U postgres --no-owner --exit-on-error -d restored &&
  diff <(logged "$key") \
    <(rdb psql -U postgres -d restored --no-psqlrc -tA -F ' ' < docker/backup/row-counts.sql) &&
  echo 'every table matches'
```

Then swap the two, and redeploy, which runs any migration newer than the
backup before the app takes traffic again:

```bash
rdb psql -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
select pg_terminate_backend(pid) from pg_stat_activity where datname = 'railway';
alter database railway rename to railway_before_restore;
alter database restored rename to railway;
SQL
railway redeploy -s treenivihko --yes
```

If a rename fails because something connected in between, run the block
again. Check `/api/health`, sign in, and look at the child's latest marks.
The old database stays as `railway_before_restore`, with the same data and
the same care, until you drop it:

```bash
rdb psql -q -U postgres -c 'drop database railway_before_restore'
```

---

## Done when

- [ ] `railway config plan` reports the configuration up to date
- [ ] A night's scheduled run logs `uploaded:` with its dump
- [ ] The restore drill prints `every table matches` for that dump
- [ ] Without credentials, the bucket answers `403`:
      `curl -s -o /dev/null -w '%{http_code}' "https://$bucket.${AWS_ENDPOINT_URL#https://}/"`

## Next

→ The features, starting with Feature 002, the exercise library.
