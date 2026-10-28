/**
 * The streak's weeks, the accomplishments due, the goals, and a pause's rules.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

import { describe, expect, it } from "vitest";
import { today } from "@/lib/periods/dates";
import {
  byEarned,
  dueOf,
  type Earned,
  earnedKey,
  goalsOf,
  type MarkedSession,
  mondayOf,
  overlappingPause,
  pauseOn,
  readPause,
  sessionsDone,
  streakOf,
} from "@/lib/streaks/rules";

// Mondays: 5.10., 12.10., 19.10., 26.10. and 2.11.2026, the current week on 5.11.
const DAY = "2026-11-05";
const COVERED = [{ startsOn: "2026-10-05", weeks: 8 }];
const W1 = "2026-10-06";
const W2 = "2026-10-13";
const W3 = "2026-10-20";
const W4 = "2026-10-27";
const W5 = "2026-11-03";

const streak = (
  doneDays: string[],
  { periods = COVERED, pauses = [] as { startsOn: string; endsOn: string }[], day = DAY } = {}
) => streakOf({ day, doneDays, periods, pauses });

describe("mondayOf", () => {
  it("is the Monday of the week, which runs Monday to Sunday", () => {
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    expect(mondayOf("2026-11-05")).toBe("2026-11-02");
    expect(mondayOf("2026-11-08")).toBe("2026-11-02");
    expect(mondayOf("2027-01-03")).toBe("2026-12-28");
  });
});

describe("streakOf", () => {
  it("is nothing with no period and no session done", () => {
    expect(streak([], { periods: [] })).toEqual({ current: 0, best: 0, thisWeekDone: false });
  });

  it("counts done weeks back from the current one, which stands while nothing is done yet", () => {
    expect(streak([W1, W2, W3, W4])).toEqual({ current: 4, best: 4, thisWeekDone: false });
    expect(streak([W1, W2, W3, W4, W5])).toEqual({ current: 5, best: 5, thisWeekDone: true });
  });

  it("counts a week once, whatever its sessions done", () => {
    expect(streak([W4, "2026-10-28", "2026-11-01"])).toEqual({
      current: 1,
      best: 1,
      thisWeekDone: false,
    });
  });

  it("is broken by a missed week, and keeps the longest run as the best", () => {
    expect(streak([W1, W2, W4])).toEqual({ current: 1, best: 2, thisWeekDone: false });
    expect(streak([W1, W2, W3, W5])).toEqual({ current: 1, best: 3, thisWeekDone: true });
  });

  it("skips a week with a paused day, and counts one done anyway", () => {
    const pauses = [{ startsOn: "2026-10-25", endsOn: "2026-10-25" }];
    expect(streak([W1, W2, W4], { pauses: [{ startsOn: W3, endsOn: W3 }] })).toMatchObject({
      current: 3,
      best: 3,
    });
    expect(streak([W1, W2, W3, W4], { pauses })).toMatchObject({ current: 4 });
  });

  it("skips a week no period covers, and not one a period covers in part", () => {
    const apart = [
      { startsOn: "2026-10-05", weeks: 2 },
      { startsOn: "2026-10-26", weeks: 2 },
    ];
    expect(streak([W1, W2, W4], { periods: apart })).toMatchObject({ current: 3 });
    const inPart = [
      { startsOn: "2026-10-05", weeks: 2 },
      { startsOn: "2026-10-22", weeks: 3 },
    ];
    expect(streak([W1, W2, W4], { periods: inPart })).toMatchObject({ current: 1, best: 2 });
  });

  it("counts a session done in a week no period covers", () => {
    expect(streak(["2026-09-29", W1], { periods: COVERED })).toMatchObject({ current: 0, best: 2 });
  });

  it("runs across a new year, a week Monday to Sunday", () => {
    expect(
      streak(["2026-12-23", "2027-01-02"], {
        periods: [{ startsOn: "2026-12-21", weeks: 4 }],
        day: "2027-01-05",
      })
    ).toEqual({ current: 2, best: 2, thisWeekDone: false });
  });

  it("ends the current week at midnight on Monday in Finnish time", () => {
    const sunday = today(new Date("2026-11-08T21:30:00Z"));
    const monday = today(new Date("2026-11-08T22:30:00Z"));
    expect(streak([W1, W2, W3, W4], { day: sunday })).toMatchObject({ current: 4 });
    expect(streak([W1, W2, W3, W4], { day: monday })).toMatchObject({ current: 0, best: 4 });
  });
});

const session = (overrides: Partial<MarkedSession> = {}): MarkedSession => ({
  periodId: "p1",
  status: "done",
  trainedOn: W1,
  easiest: null,
  hardest: null,
  ...overrides,
});

const PERIODS = [{ id: "p1", startsOn: "2026-10-05", weeks: 2 }];
const none = new Set<string>();
const kinds = (sessions: MarkedSession[], { best = 0, earned = none, periods = PERIODS } = {}) =>
  dueOf({ sessions, periods, best, earned }).map((each) => each.kind);

describe("sessionsDone", () => {
  it("counts sessions done in full or in part, not those not done or unmarked", () => {
    expect(
      sessionsDone([
        { status: "done" },
        { status: "partly" },
        { status: "not_done" },
        { status: null },
      ])
    ).toBe(2);
  });
});

describe("dueOf", () => {
  it("is due a session count at its threshold, and not one below", () => {
    const sessions = (count: number) =>
      Array.from({ length: count }, () => session({ periodId: "p2", status: "partly" }));
    expect(kinds(sessions(1))).toEqual(["sessions_1"]);
    expect(kinds(sessions(9))).toEqual(["sessions_1"]);
    expect(kinds(sessions(10))).toEqual(["sessions_1", "sessions_10"]);
    expect(kinds(sessions(100))).toEqual([
      "sessions_1",
      "sessions_10",
      "sessions_25",
      "sessions_50",
      "sessions_100",
    ]);
    expect(
      kinds([session({ status: "not_done", trainedOn: null }), session({ status: null })])
    ).toEqual([]);
  });

  it("is due a streak length by the best streak, at its threshold and not one below", () => {
    expect(kinds([], { best: 3 })).toEqual([]);
    expect(kinds([], { best: 4 })).toEqual(["streak_4"]);
    expect(kinds([], { best: 26 })).toEqual(["streak_4", "streak_8", "streak_12", "streak_26"]);
  });

  it("is due a full period once each, with its id and dates, only when every session is done in full", () => {
    const full = dueOf({
      sessions: [session(), session()],
      periods: PERIODS,
      best: 0,
      earned: none,
    }).find((each) => each.kind === "full_period");
    expect(full).toEqual({
      kind: "full_period",
      key: "p1",
      periodStartsOn: "2026-10-05",
      periodWeeks: 2,
      exerciseId: null,
    });
    expect(kinds([session(), session({ status: "partly" })])).not.toContain("full_period");
    expect(kinds([session(), session({ status: null })])).not.toContain("full_period");
    expect(kinds([session({ periodId: "p2" })])).not.toContain("full_period");
  });

  it("is due hard became easy once per exercise, only with the easiest on a later day", () => {
    const due = (sessions: MarkedSession[]) =>
      dueOf({ sessions, periods: [], best: 0, earned: none })
        .filter((each) => each.kind === "hard_to_easy")
        .map((each) => [each.key, each.exerciseId]);
    expect(
      due([session({ hardest: "e1", trainedOn: W1 }), session({ easiest: "e1", trainedOn: W2 })])
    ).toEqual([["e1", "e1"]]);
    // The earliest hardest against the latest easiest, whatever order the marks come in.
    expect(
      due([
        session({ easiest: "e1", trainedOn: W3 }),
        session({ hardest: "e1", trainedOn: W2 }),
        session({ hardest: "e1", trainedOn: W1 }),
        session({ easiest: "e1", trainedOn: W1 }),
      ])
    ).toEqual([["e1", "e1"]]);
    // An earlier hardest seen after a later one still counts against an easiest between them.
    expect(
      due([
        session({ hardest: "e1", trainedOn: W3 }),
        session({ hardest: "e1", trainedOn: W1 }),
        session({ easiest: "e1", trainedOn: W2 }),
      ])
    ).toEqual([["e1", "e1"]]);
    expect(due([session({ hardest: "e1", easiest: "e1" })])).toEqual([]);
    expect(
      due([session({ hardest: "e1", trainedOn: W2 }), session({ easiest: "e1", trainedOn: W2 })])
    ).toEqual([]);
    expect(
      due([session({ easiest: "e1", trainedOn: W1 }), session({ hardest: "e1", trainedOn: W2 })])
    ).toEqual([]);
    expect(due([session({ hardest: "e1" }), session({ easiest: "e2", trainedOn: W2 })])).toEqual(
      []
    );
    expect(
      due([
        session({ status: "not_done", trainedOn: null }),
        session({ easiest: "e1", trainedOn: W2 }),
      ])
    ).toEqual([]);
  });

  it("leaves out what is already earned", () => {
    const earned = new Set([earnedKey({ kind: "sessions_1", key: "" }), "full_period|p1"]);
    expect(kinds([session()], { earned })).toEqual([]);
    expect(kinds([session()], { earned: new Set(["full_period|p2"]) })).toEqual([
      "sessions_1",
      "full_period",
    ]);
  });
});

const earned = (overrides: Partial<Earned>): Earned => ({
  id: "a",
  kind: "sessions_1",
  earnedOn: W1,
  periodStartsOn: null,
  periodWeeks: null,
  exerciseName: null,
  ...overrides,
});

describe("byEarned", () => {
  it("puts the newest first, then the kinds' order, then the period, then the exercise in Finnish order", () => {
    const list = [
      earned({ id: "old", earnedOn: W1 }),
      earned({ id: "streak", kind: "streak_4", earnedOn: W2 }),
      earned({ id: "count", kind: "sessions_10", earnedOn: W2 }),
      earned({ id: "later period", kind: "full_period", earnedOn: W2, periodStartsOn: W3 }),
      earned({ id: "earlier period", kind: "full_period", earnedOn: W2, periodStartsOn: W1 }),
      earned({ id: "Ämpäri", kind: "hard_to_easy", earnedOn: W2, exerciseName: "Ämpäri" }),
      earned({ id: "aita", kind: "hard_to_easy", earnedOn: W2, exerciseName: "aita" }),
      earned({ id: "Zeta", kind: "hard_to_easy", earnedOn: W2, exerciseName: "Zeta" }),
    ];
    expect(list.sort(byEarned).map((each) => each.id)).toEqual([
      "count",
      "streak",
      "earlier period",
      "later period",
      "aita",
      "Zeta",
      "Ämpäri",
      "old",
    ]);
  });
});

describe("goalsOf", () => {
  const keys = (...kinds: string[]) => new Set(kinds.map((kind) => earnedKey({ kind, key: "" })));

  it("is the next session count and streak length not earned, with their progress", () => {
    expect(goalsOf({ earned: none, done: 0, streak: 0 })).toEqual([
      { kind: "sessions_1", have: 0, goal: 1 },
      { kind: "streak_4", have: 0, goal: 4 },
    ]);
    expect(
      goalsOf({ earned: keys("sessions_1", "sessions_10", "streak_4"), done: 12, streak: 5 })
    ).toEqual([
      { kind: "sessions_25", have: 12, goal: 25 },
      { kind: "streak_8", have: 5, goal: 8 },
    ]);
  });

  it("leaves out a goal earned at every step", () => {
    const sessions = keys(
      "sessions_1",
      "sessions_10",
      "sessions_25",
      "sessions_50",
      "sessions_100"
    );
    expect(goalsOf({ earned: sessions, done: 100, streak: 2 })).toEqual([
      { kind: "streak_4", have: 2, goal: 4 },
    ]);
    const all = new Set([...sessions, ...keys("streak_4", "streak_8", "streak_12", "streak_26")]);
    expect(goalsOf({ earned: all, done: 100, streak: 30 })).toEqual([]);
  });
});

describe("readPause", () => {
  it("takes a pause of 1 to 182 days, trimmed", () => {
    expect(readPause(" 2026-11-03 ", "2026-11-03")).toEqual({
      ok: true,
      pause: { startsOn: "2026-11-03", endsOn: "2026-11-03" },
    });
    expect(readPause("2026-01-01", "2026-07-01")).toEqual({
      ok: true,
      pause: { startsOn: "2026-01-01", endsOn: "2026-07-01" },
    });
  });

  it("refuses 183 days, and an end before the start", () => {
    expect(readPause("2026-01-01", "2026-07-02")).toEqual({
      ok: false,
      errors: { endsOn: "Tauko voi olla enintään 26 viikkoa." },
    });
    expect(readPause("2026-11-03", "2026-11-02")).toEqual({
      ok: false,
      errors: { endsOn: "Tauko ei voi päättyä ennen alkuaan." },
    });
  });

  it("refuses a day that is not one, and checks the end against no start", () => {
    expect(readPause("", "3.11.2026")).toEqual({
      ok: false,
      errors: { startsOn: "Anna alkamispäivä.", endsOn: "Anna päättymispäivä." },
    });
    expect(readPause("2026-02-30", "2026-01-01")).toEqual({
      ok: false,
      errors: { startsOn: "Anna alkamispäivä." },
    });
  });
});

describe("overlappingPause and pauseOn", () => {
  const pauses = [
    { id: "a", startsOn: "2026-11-02", endsOn: "2026-11-08" },
    { id: "b", startsOn: "2026-11-20", endsOn: "2026-11-20" },
  ];

  it("finds the pause that shares a day, first and last days included", () => {
    expect(overlappingPause(pauses, { startsOn: "2026-11-08", endsOn: "2026-11-10" })?.id).toBe(
      "a"
    );
    expect(overlappingPause(pauses, { startsOn: "2026-11-15", endsOn: "2026-11-20" })?.id).toBe(
      "b"
    );
    expect(
      overlappingPause(pauses, { startsOn: "2026-11-09", endsOn: "2026-11-19" })
    ).toBeUndefined();
  });

  it("finds the pause that includes a day", () => {
    expect(pauseOn(pauses, "2026-11-02")?.id).toBe("a");
    expect(pauseOn(pauses, "2026-11-08")?.id).toBe("a");
    expect(pauseOn(pauses, "2026-11-09")).toBeUndefined();
  });
});
