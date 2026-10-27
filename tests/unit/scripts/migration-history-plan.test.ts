import { describe, expect, it } from "vitest";
import { checkMigrationHistory, JOURNAL } from "../../../scripts/migration-history-plan.ts";

const journal = (...tags: string[]) =>
  JSON.stringify({
    version: "7",
    entries: tags.map((tag, idx) => ({ idx, tag, when: 1_000 + idx, breakpoints: true })),
  });

const main = new Map([
  ["0000_create_a.sql", "CREATE TABLE a ();"],
  ["meta/0000_snapshot.json", '{"id":"a"}'],
  [JOURNAL, journal("0000_create_a")],
]);

const problemsOf = (head: Map<string, string>) => {
  const result = checkMigrationHistory(main, head);
  return result.ok ? [] : result.problems;
};

describe("checkMigrationHistory", () => {
  it("passes, and says so, when main has no migrations", () => {
    expect(checkMigrationHistory(new Map(), new Map([["0000_create_a.sql", "x"]]))).toEqual({
      ok: true,
      message: "main has no migrations, so there is nothing to compare",
    });
  });

  it("passes an unchanged history", () => {
    expect(checkMigrationHistory(main, new Map(main))).toEqual({
      ok: true,
      message: "the 3 migration files on main are unchanged",
    });
  });

  it("passes a new migration: new files, and a journal entry after the existing ones", () => {
    const head = new Map(main);
    head.set("0001_add_b.sql", "ALTER TABLE a ADD b int;");
    head.set("meta/0001_snapshot.json", '{"id":"b"}');
    head.set(JOURNAL, journal("0000_create_a", "0001_add_b"));
    expect(checkMigrationHistory(main, head).ok).toBe(true);
  });

  it.each([
    ["0000_create_a.sql", "CREATE TABLE a (b int);"],
    ["meta/0000_snapshot.json", '{"id":"changed"}'],
  ])("refuses %s edited", (file, content) => {
    const head = new Map(main);
    head.set(file, content);
    expect(problemsOf(head)).toEqual([
      `${file} changed: an applied migration is never edited; add a new one instead`,
    ]);
  });

  it.each(["0000_create_a.sql", "meta/0000_snapshot.json", JOURNAL])(
    "refuses %s missing, as deleted, renamed or from a branch behind main",
    (file) => {
      const head = new Map(main);
      head.delete(file);
      expect(problemsOf(head)).toEqual([
        `${file} is on main but not here: rebase onto main, or restore it`,
      ]);
    }
  );

  it("refuses a rename as the original file missing", () => {
    const head = new Map(main);
    head.delete("0000_create_a.sql");
    head.set("0000_create_alpha.sql", "CREATE TABLE a ();");
    expect(problemsOf(head)).toEqual([
      "0000_create_a.sql is on main but not here: rebase onto main, or restore it",
    ]);
  });

  it.each([
    ["an existing entry changed", journal("0000_create_renamed")],
    ["an entry put before the existing ones", journal("0000_create_new", "0000_create_a")],
    ["the existing entries removed", journal()],
  ])("refuses a journal with %s", (_case, changed) => {
    const head = new Map(main);
    head.set(JOURNAL, changed);
    expect(problemsOf(head)).toEqual([
      `${JOURNAL}: entry 0 (0000_create_a) changed, moved or disappeared`,
    ]);
  });

  it.each([
    ["text that is not JSON", "{"],
    ["no entries", '{"version":"7"}'],
    ["an entry that is null", '{"version":"7","entries":[null]}'],
    ["an entry that is a list", '{"version":"7","entries":[["0000_create_a"]]}'],
  ])("refuses a journal on the branch with %s", (_case, broken) => {
    const head = new Map(main);
    head.set(JOURNAL, broken);
    expect(problemsOf(head)).toEqual([
      `${JOURNAL} is not a journal: it has no list of entries, or one is not an object`,
    ]);
  });

  it.each([
    ["not JSON", "{"],
    ["an entry that is null", '{"version":"7","entries":[null]}'],
  ])("refuses when main's own journal is %s, rather than pass it", (_case, journalText) => {
    const broken = new Map(main);
    broken.set(JOURNAL, journalText);
    const result = checkMigrationHistory(broken, new Map(main));
    expect(result).toEqual({
      ok: false,
      problems: [`${JOURNAL} on main is not a journal, so nothing can be compared with it`],
    });
  });

  it("names every problem, not only the first", () => {
    const head = new Map(main);
    head.set("0000_create_a.sql", "edited");
    head.delete("meta/0000_snapshot.json");
    expect(problemsOf(head)).toEqual([
      "0000_create_a.sql changed: an applied migration is never edited; add a new one instead",
      "meta/0000_snapshot.json is on main but not here: rebase onto main, or restore it",
    ]);
  });
});
