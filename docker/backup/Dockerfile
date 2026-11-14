# The nightly backup on Railway: pg_dump of Postgres into the project's bucket.
# Built from the repository root, which Railway uses as the build context.
# Postgres's own image, at a major no older than Railway's server, which
# pg_dump refuses; tests/unit/config/railway.test.ts fails when it is older.
#
# decisions/063-database-backups.md
# decisions/080-backup-deadline.md
FROM postgres:18-alpine

RUN apk add --no-cache aws-cli

COPY docker/backup/aws-config /etc/backup/aws-config
COPY docker/backup/entrypoint.sh docker/backup/backup.sh docker/backup/row-counts.sql \
  /usr/local/lib/backup/
ENV AWS_CONFIG_FILE=/etc/backup/aws-config

USER postgres
ENTRYPOINT ["sh", "/usr/local/lib/backup/entrypoint.sh"]
