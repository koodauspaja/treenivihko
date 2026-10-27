import { describe, expect, it } from "vitest";
import {
  MIGRATION_NAME,
  MIGRATION_TAG,
  planMigrationGeneration,
} from "../../../scripts/migration-name.ts";

describe("planMigrationGeneration", () => {
  it.each([["--name=create_exercises"], ["--name", "add_marks_to_sessions"]])(
    "lets %s through, forwarding every argument",
    (...argv) => {
      expect(planMigrationGeneration([...argv, "--config", "x.ts"])).toEqual({
        ok: true,
        forwarded: [...argv, "--config", "x.ts"],
      });
    }
  );

  it("refuses a run without --name, and says what a name looks like", () => {
    const plan = planMigrationGeneration([]);
    expect(plan.ok).toBe(false);
    expect(plan.ok || plan.message).toMatch(/Missing --name[\s\S]*<verb>_<what>/);
  });

  it.each([
    ["no value", ["--name"]],
    ["a flag as its value", ["--name", "--config"]],
  ])("refuses --name with %s", (_name, argv) => {
    const plan = planMigrationGeneration(argv);
    expect(plan.ok || plan.message).toMatch(/no value/);
  });

  it("refuses --name given twice", () => {
    const plan = planMigrationGeneration(["--name=add_a", "--name=add_b"]);
    expect(plan.ok || plan.message).toMatch(/given 2 times/);
  });

  it.each([["young_meteorite"], ["Create_exercises"], ["create-exercises"], ["create_"], ["add"]])(
    "refuses %s as a name",
    (name) => {
      const plan = planMigrationGeneration([`--name=${name}`]);
      expect(plan.ok || plan.message).toMatch(/not a usable migration name/);
    }
  );
});

describe("the name rule", () => {
  it("is <verb>_<what> for a name and NNNN_<verb>_<what> for a tag", () => {
    expect(MIGRATION_NAME.test("create_exercises")).toBe(true);
    expect(MIGRATION_TAG.test("0003_create_exercises")).toBe(true);
    expect(MIGRATION_TAG.test("0003_young_meteorite")).toBe(false);
    expect(MIGRATION_TAG.test("create_exercises")).toBe(false);
  });
});
