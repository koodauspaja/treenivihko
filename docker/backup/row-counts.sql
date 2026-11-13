-- Every table's row count, one "schema.table count" line each: logged by each
-- night's backup, and counted again in the restore drill to compare with it.
--
-- decisions/031-database-dump.md
-- decisions/063-database-backups.md
select table_schema || '.' || table_name,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
from information_schema.tables
where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE'
order by 1;
