/**
 * Whether a branch keeps every migration `main` already has exactly as it is.
 * A database runs each migration once, so an edit reaches fresh databases and
 * never the ones it already ran on. New migrations, and journal entries after
 * the existing ones, are what a branch may add.
 *
 * decisions/023-database.md
 * decisions/025-migration-history.md
 */

/** The migrations folder's files, by path relative to it, with their contents. */
export type MigrationFiles = ReadonlyMap<string, string>;

export type HistoryCheck = { ok: true; message: string } | { ok: false; problems: string[] };

/** drizzle-kit's journal, relative to the migrations folder. */
export const JOURNAL = "meta/_journal.json";

type Entry = Record<string, unknown>;

/** The journal's entries, or null when the text is not a journal. */
function entriesOf(journal: string): Entry[] | null {
  try {
    const parsed: unknown = JSON.parse(journal);
    const entries = (parsed as { entries?: unknown }).entries;
    return Array.isArray(entries) ? (entries as Entry[]) : null;
  } catch {
    return null;
  }
}

/** What is wrong with the head's journal, given the base's. */
function journalProblems(base: string, head: string): string[] {
  const baseEntries = entriesOf(base);
  const headEntries = entriesOf(head);
  if (baseEntries === null) {
    return [`${JOURNAL} on main is not a journal, so nothing can be compared with it`];
  }
  if (headEntries === null) {
    return [`${JOURNAL} is not a journal: it has no list of entries`];
  }
  return baseEntries.flatMap((entry, index) =>
    JSON.stringify(headEntries[index]) === JSON.stringify(entry)
      ? []
      : [`${JOURNAL}: entry ${index} (${String(entry.tag)}) changed, moved or disappeared`]
  );
}

/** Compares a branch's migrations with `main`'s: every file `main` has must be there, unchanged. */
export function checkMigrationHistory(base: MigrationFiles, head: MigrationFiles): HistoryCheck {
  if (base.size === 0) {
    return { ok: true, message: "main has no migrations, so there is nothing to compare" };
  }
  const problems = [...base].flatMap(([path, content]) => {
    const now = head.get(path);
    if (now === undefined) {
      return [`${path} is on main but not here: rebase onto main, or restore it`];
    }
    if (path === JOURNAL) {
      return journalProblems(content, now);
    }
    return now === content
      ? []
      : [`${path} changed: an applied migration is never edited; add a new one instead`];
  });
  return problems.length === 0
    ? { ok: true, message: `the ${base.size} migration files on main are unchanged` }
    : { ok: false, problems };
}
