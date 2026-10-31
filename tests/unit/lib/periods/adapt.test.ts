/**
 * The rules that adapt a copied period to its marks: the direction, the
 * amount's step and bounds, and each pick's change, with the swaps' order.
 *
 * decisions/f009-adapted-period.md
 */

import { describe, expect, it } from "vitest";
import type { Mark } from "@/lib/marks/rules";
import { NO_PICKS } from "@/lib/marks/rules";
import {
  adaptationOf,
  directionOf,
  type LibraryExercise,
  type SourceSession,
  stepAmount,
} from "@/lib/periods/adapt";

const mark = (
  status: Mark["status"],
  feeling: number | null,
  picks: Partial<Mark["picks"]> = {}
): Mark => ({
  status,
  trainedOn: status === "not_done" ? null : "2026-11-03",
  feeling,
  picks: { ...NO_PICKS, ...picks },
});

const library = (
  id: string,
  name: string,
  level: 1 | 2 | 3,
  labels: string[],
  amount = 10,
  amountKind: "count" | "time" = "count"
): LibraryExercise => ({ id, name, level, amountKind, amount, labels });

const at = (
  id: string,
  exerciseId: string,
  amount = 10,
  amountKind: "count" | "time" = "count"
) => ({
  id,
  exerciseId,
  amountKind,
  amount,
});

const session = (
  exercises: SourceSession["exercises"],
  sessionMark: Mark | null,
  position = 1
): SourceSession => ({
  position,
  place: "field",
  equipment: ["ball", "cones"],
  exercises,
  mark: sessionMark,
});

describe("directionOf", () => {
  it("is up after done with 😄 or 🙂, none with 😐 or no feeling, down otherwise", () => {
    expect(directionOf(mark("done", 5))).toBe("up");
    expect(directionOf(mark("done", 4))).toBe("up");
    expect(directionOf(mark("done", 3))).toBeNull();
    expect(directionOf(mark("done", null))).toBeNull();
    expect(directionOf(mark("done", 2))).toBe("down");
    expect(directionOf(mark("done", 1))).toBe("down");
    expect(directionOf(mark("partly", 5))).toBe("down");
    expect(directionOf(mark("partly", null))).toBe("down");
    expect(directionOf(mark("not_done", null))).toBe("down");
  });
});

describe("stepAmount", () => {
  it("steps a count 20%, to a whole number, by at least one", () => {
    expect(stepAmount("count", 10, 10, "up")).toBe(12);
    expect(stepAmount("count", 10, 10, "down")).toBe(8);
    expect(stepAmount("count", 5, 5, "up")).toBe(6);
    expect(stepAmount("count", 5, 5, "down")).toBe(4);
    expect(stepAmount("count", 2, 2, "up")).toBe(3);
    expect(stepAmount("count", 2, 2, "down")).toBe(1);
  });

  it("keeps a count within Feature 002's 1 to 100", () => {
    expect(stepAmount("count", 1, 1, "down")).toBe(1);
    expect(stepAmount("count", 1, 1, "up")).toBe(2);
    expect(stepAmount("count", 100, 100, "up")).toBe(100);
    expect(stepAmount("count", 100, 100, "down")).toBe(80);
  });

  it("steps a time 20%, to 5 seconds, by at least 5, within 5 to 600 seconds", () => {
    expect(stepAmount("time", 30, 30, "up")).toBe(35);
    expect(stepAmount("time", 30, 30, "down")).toBe(25);
    expect(stepAmount("time", 5, 5, "up")).toBe(10);
    expect(stepAmount("time", 5, 5, "down")).toBe(5);
    expect(stepAmount("time", 595, 595, "up")).toBe(600);
    expect(stepAmount("time", 600, 600, "up")).toBe(600);
    expect(stepAmount("time", 600, 600, "down")).toBe(480);
  });

  it("stays between half and double the library default, half rounded up and double down", () => {
    expect(stepAmount("count", 14, 7, "up")).toBe(14);
    expect(stepAmount("count", 13, 7, "up")).toBe(14);
    expect(stepAmount("count", 4, 7, "down")).toBe(4);
    expect(stepAmount("count", 5, 7, "down")).toBe(4);
    expect(stepAmount("time", 15, 25, "down")).toBe(15);
    expect(stepAmount("time", 50, 25, "up")).toBe(50);
  });

  it("never moves an amount set outside the bounds against the direction", () => {
    expect(stepAmount("count", 30, 10, "up")).toBe(30);
    expect(stepAmount("count", 30, 10, "down")).toBe(20);
    expect(stepAmount("count", 2, 10, "down")).toBe(2);
    expect(stepAmount("count", 2, 10, "up")).toBe(5);
  });
});

describe("adaptationOf", () => {
  const dribble = library("e-dribble", "Kuljetus", 1, ["dribbling", "field", "ball"]);
  const feint = library("e-feint", "Harhautus", 1, ["feint", "field", "ball"]);
  const sprint = library("e-sprint", "Pikajuoksu", 1, ["speed", "field"], 30, "time");

  it("copies a session with no mark as it is", () => {
    const result = adaptationOf([session([at("b1", dribble.id)], null)], [dribble]);
    expect(result.replacements.size).toBe(0);
    expect(result.changes).toEqual([]);
  });

  it("changes nothing after done with 😐", () => {
    const result = adaptationOf([session([at("b1", dribble.id)], mark("done", 3))], [dribble]);
    expect(result.changes).toEqual([]);
    expect(result.replacements.size).toBe(0);
  });

  it("steps every amount in the direction, and lists each change in session order", () => {
    const result = adaptationOf(
      [
        session([at("b1", dribble.id), at("b2", sprint.id, 30, "time")], mark("done", 5), 1),
        session([at("b3", feint.id)], mark("partly", null), 2),
      ],
      [dribble, feint, sprint]
    );
    expect(result.replacements.get("b1")).toEqual({
      exerciseId: dribble.id,
      amountKind: "count",
      amount: 12,
    });
    expect(result.replacements.get("b2")).toEqual({
      exerciseId: sprint.id,
      amountKind: "time",
      amount: 35,
    });
    expect(result.replacements.get("b3")).toEqual({
      exerciseId: feint.id,
      amountKind: "count",
      amount: 8,
    });
    expect(result.changes).toEqual([
      {
        kind: "amount",
        id: "b1",
        session: 1,
        name: "Kuljetus",
        amountKind: "count",
        from: 10,
        to: 12,
      },
      {
        kind: "amount",
        id: "b2",
        session: 1,
        name: "Pikajuoksu",
        amountKind: "time",
        from: 30,
        to: 35,
      },
      {
        kind: "amount",
        id: "b3",
        session: 2,
        name: "Harhautus",
        amountKind: "count",
        from: 10,
        to: 8,
      },
    ]);
  });

  it("lists no change for an amount that ends where it was", () => {
    const tiny = library("e-tiny", "Pieni", 1, ["dribbling", "field"], 1);
    const result = adaptationOf([session([at("b1", tiny.id, 1)], mark("not_done", null))], [tiny]);
    expect(result.changes).toEqual([]);
    expect(result.replacements.size).toBe(0);
  });

  it("leaves an amount whose kind is no longer the library's", () => {
    const changed = library("e-changed", "Muuttunut", 1, ["dribbling", "field"], 30, "time");
    const result = adaptationOf(
      [session([at("b1", changed.id, 10, "count")], mark("done", 5))],
      [changed]
    );
    expect(result.changes).toEqual([]);
    expect(result.replacements.size).toBe(0);
  });

  it("takes the hardest down even after a good session, and never swaps it", () => {
    const result = adaptationOf(
      [
        session(
          [at("b1", dribble.id)],
          mark("done", 5, { hardest: dribble.id, likedLeast: dribble.id })
        ),
      ],
      [dribble, feint]
    );
    expect(result.replacements.get("b1")?.amount).toBe(8);
    expect(result.changes).toHaveLength(1);
  });

  it("keeps the liked best, following the direction, whatever else it was picked as", () => {
    const result = adaptationOf(
      [
        session(
          [at("b1", dribble.id)],
          mark("done", 4, { likedBest: dribble.id, hardest: dribble.id })
        ),
      ],
      [dribble, library("e-other", "Kuljetus kartioilla", 1, ["dribbling", "field"])]
    );
    expect(result.replacements.get("b1")).toEqual({
      exerciseId: dribble.id,
      amountKind: "count",
      amount: 12,
    });
  });

  it("swaps the liked least for one sharing a skill, at its level, fitting and not in the session", () => {
    const dribble2 = library(
      "e-dribble2",
      "Kuljetus kartioilla",
      1,
      ["dribbling", "field", "cones"],
      8
    );
    const harder = library("e-harder", "Kuljetus nopeasti", 2, ["dribbling", "field"]);
    const indoors = library("e-indoors", "Kuljetus sisällä", 1, ["dribbling", "indoors"]);
    const hurdles = library("e-hurdles", "Kuljetus aidoilla", 1, ["dribbling", "field", "hurdles"]);
    const placeOnly = library("e-place", "Pelkkä kenttä", 1, ["speed", "field"]);
    const result = adaptationOf(
      [
        session(
          [at("b1", dribble.id), at("b2", feint.id)],
          mark("done", 3, { likedLeast: dribble.id })
        ),
      ],
      [dribble, feint, dribble2, harder, indoors, hurdles, placeOnly]
    );
    expect(result.replacements.get("b1")).toEqual({
      exerciseId: dribble2.id,
      amountKind: "count",
      amount: 8,
    });
    expect(result.changes).toEqual([
      {
        kind: "swap",
        id: "b1",
        session: 1,
        from: "Kuljetus",
        to: "Kuljetus kartioilla",
        amountKind: "count",
        amount: 8,
      },
    ]);
  });

  it("prefers an exercise not in the latest period, then the first by Finnish name", () => {
    const aa = library("e-aa", "Aaltokuljetus", 1, ["dribbling", "field"]);
    const zz = library("e-zz", "Zetakuljetus", 1, ["dribbling", "field"]);
    const aeae = library("e-ae", "Äkkikuljetus", 1, ["dribbling", "field"]);
    const used = [
      session([at("b1", dribble.id)], mark("done", 3, { likedLeast: dribble.id }), 1),
      session([at("b2", aa.id)], null, 2),
    ];
    expect(adaptationOf(used, [dribble, aa, zz, aeae]).replacements.get("b1")?.exerciseId).toBe(
      zz.id
    );
    const allUsed = [...used, session([at("b3", zz.id), at("b4", aeae.id)], null, 3)];
    expect(adaptationOf(allUsed, [dribble, aa, zz, aeae]).replacements.get("b1")?.exerciseId).toBe(
      aa.id
    );
  });

  it("follows the direction when there is nothing to swap the liked least for", () => {
    const result = adaptationOf(
      [session([at("b1", dribble.id)], mark("done", 2, { likedLeast: dribble.id }))],
      [dribble, feint]
    );
    expect(result.replacements.get("b1")).toEqual({
      exerciseId: dribble.id,
      amountKind: "count",
      amount: 8,
    });
  });

  it("leaves the liked least as it is with nothing to swap it for and no direction", () => {
    const result = adaptationOf(
      [session([at("b1", dribble.id)], mark("done", 3, { likedLeast: dribble.id }))],
      [dribble, feint]
    );
    expect(result.changes).toEqual([]);
    expect(result.replacements.size).toBe(0);
  });

  it("swaps the easiest for one a level up after a good session", () => {
    const harder = library("e-harder", "Kuljetus nopeasti", 2, ["dribbling", "field"], 6);
    const result = adaptationOf(
      [session([at("b1", dribble.id)], mark("done", 5, { easiest: dribble.id }))],
      [dribble, harder]
    );
    expect(result.replacements.get("b1")).toEqual({
      exerciseId: harder.id,
      amountKind: "count",
      amount: 6,
    });
  });

  it("takes the easiest up in amount when there is no level up, as at level 3", () => {
    const hardest = library("e-top", "Huippukuljetus", 3, ["dribbling", "field"]);
    const result = adaptationOf(
      [session([at("b1", hardest.id)], mark("done", 5, { easiest: hardest.id }))],
      [hardest, dribble]
    );
    expect(result.replacements.get("b1")).toEqual({
      exerciseId: hardest.id,
      amountKind: "count",
      amount: 12,
    });
  });

  it("only steps the easiest when the session did not go well", () => {
    const harder = library("e-harder", "Kuljetus nopeasti", 2, ["dribbling", "field"]);
    const result = adaptationOf(
      [session([at("b1", dribble.id)], mark("partly", null, { easiest: dribble.id }))],
      [dribble, harder]
    );
    expect(result.replacements.get("b1")?.exerciseId).toBe(dribble.id);
    expect(result.replacements.get("b1")?.amount).toBe(8);
  });

  it("changes an exercise in two blocks the same in each", () => {
    const dribble2 = library("e-dribble2", "Kuljetus kartioilla", 1, ["dribbling", "field"]);
    const result = adaptationOf(
      [
        session(
          [at("b1", dribble.id), at("b2", dribble.id)],
          mark("done", 3, { likedLeast: dribble.id })
        ),
      ],
      [dribble, dribble2]
    );
    expect(result.replacements.get("b1")?.exerciseId).toBe(dribble2.id);
    expect(result.replacements.get("b2")?.exerciseId).toBe(dribble2.id);
    expect(result.changes).toHaveLength(2);
  });

  it("does not swap two exercises of a session for the same one", () => {
    const mid = library("e-mid", "Harhautus nopeasti", 2, ["feint", "field"]);
    const both = library("e-both", "Kuljetus ja harhautus", 2, ["dribbling", "feint", "field"]);
    const result = adaptationOf(
      [
        session(
          [at("b1", mid.id), at("b2", dribble.id)],
          mark("done", 5, { likedLeast: mid.id, easiest: dribble.id })
        ),
      ],
      [dribble, mid, both]
    );
    expect(result.replacements.get("b1")?.exerciseId).toBe(both.id);
    // The one a level up is taken, so the easiest goes up in amount instead.
    expect(result.replacements.get("b2")).toEqual({
      exerciseId: dribble.id,
      amountKind: "count",
      amount: 12,
    });
  });

  it("leaves an exercise no pick names alone in a session with no direction", () => {
    const result = adaptationOf(
      [
        session(
          [at("b1", dribble.id), at("b2", feint.id)],
          mark("done", null, { hardest: feint.id })
        ),
      ],
      [dribble, feint]
    );
    expect(result.replacements.has("b1")).toBe(false);
    expect(result.replacements.get("b2")?.amount).toBe(8);
  });
});
