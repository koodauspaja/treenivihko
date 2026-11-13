#!/bin/sh
# One night's backup: dump Postgres, upload it to the bucket, then remove all
# but the newest $keep. The log carries the object's name, its size and each
# table's row count, never a row.
#
# decisions/031-database-dump.md
# decisions/063-database-backups.md
set -eu
set -o pipefail

keep=14
here=/usr/local/lib/backup
dump=/tmp/backup.dump
key="treenivihko-$(date -u +%Y-%m-%dT%H%M%SZ).dump"

pg_dump --format=custom --dbname="$DATABASE_URL" --file="$dump"
# What the restore drill compares with. Counted after the dump, not inside its
# snapshot: a write in between makes the drill fail, never pass, and nothing
# writes at night.
psql --dbname="$DATABASE_URL" --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only \
  --no-align --field-separator=' ' --file="$here/row-counts.sql" | sed 's/^/row count: /'

# An object appears only once its upload completes, so a failed dump, count or
# upload leaves the bucket as it was, and stops before anything is removed.
aws s3 cp "$dump" "s3://$BUCKET/$key" --only-show-errors
echo "uploaded: $key, $(wc -c < "$dump") bytes"

# Names sort by the time in them, so the newest come first.
aws s3api list-objects-v2 --bucket "$BUCKET" --prefix treenivihko- \
  --query 'Contents[].Key' --output text |
  tr '\t' '\n' | grep '\.dump$' | sort -r | tail -n "+$((keep + 1))" |
  while read -r old; do
    aws s3 rm "s3://$BUCKET/$old" --only-show-errors
    echo "removed: $old"
  done
