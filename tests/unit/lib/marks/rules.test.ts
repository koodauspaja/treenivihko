import { describe, expect, it } from "vitest";
import {
  emojiOf,
  FEELINGS,
  type MarkInput,
  markableOf,
  NO_PICKS,
  pickOptions,
  readMark,
} from "@/lib/marks/rules";

const TODAY = "2026-11-05";
const NO_PICK_INPUT = { likedBest: "", likedLeast: "", easiest: "", hardest: "" };
const input = (change: Partial<MarkInput>): MarkInput => ({
  status: "done",
  trainedOn: TODAY,
  feeling: "",
  picks: NO_PICK_INPUT,
  ...change,
});

describe("readMark", () => {
  it("reads a mark done in full, with its day, face and picks", () => {
    expect(
      readMark(
        input({
          trainedOn: " 2026-11-04 ",
          feeling: "5",
          picks: { likedBest: "e1", likedLeast: "e1", easiest: "", hardest: "e2" },
        }),
        TODAY
      )
    ).toEqual({
      ok: true,
      mark: {
        status: "done",
        trainedOn: "2026-11-04",
        feeling: 5,
        picks: { likedBest: "e1", likedLeast: "e1", easiest: null, hardest: "e2" },
      },
    });
  });

  it("reads a mark done in part as one done in full", () => {
    expect(readMark(input({ status: "partly", feeling: "1" }), TODAY)).toEqual({
      ok: true,
      mark: { status: "partly", trainedOn: TODAY, feeling: 1, picks: NO_PICKS },
    });
  });

  it("keeps nothing but the status of a session not done", () => {
    expect(
      readMark(
        input({
          status: "not_done",
          trainedOn: "not a day",
          feeling: "3",
          picks: { ...NO_PICK_INPUT, likedBest: "e1" },
        }),
        TODAY
      )
    ).toEqual({
      ok: true,
      mark: { status: "not_done", trainedOn: null, feeling: null, picks: NO_PICKS },
    });
  });

  it("refuses a missing or unknown status", () => {
    for (const status of ["", "skipped"]) {
      expect(readMark(input({ status }), TODAY)).toEqual({
        ok: false,
        errors: { status: "Valitse, teitkö treenin." },
      });
    }
  });

  it("refuses a missing day, one that is not a date, and one after today", () => {
    for (const trainedOn of ["", "2026-02-30", "5.11.2026"]) {
      expect(readMark(input({ trainedOn }), TODAY)).toEqual({
        ok: false,
        errors: { trainedOn: "Valitse päivä." },
      });
    }
    expect(readMark(input({ trainedOn: "2026-11-06" }), TODAY)).toEqual({
      ok: false,
      errors: { trainedOn: "Valitse päivä jakson alusta tähän päivään." },
    });
    expect(readMark(input({ trainedOn: TODAY }), TODAY).ok).toBe(true);
  });

  it("skips a face that is not one of the five", () => {
    for (const feeling of ["", "0", "6", "2.5", "hyvä"]) {
      const reading = readMark(input({ feeling }), TODAY);
      expect(reading.ok && reading.mark.feeling).toBeNull();
    }
  });
});

describe("the faces", () => {
  it("are five, happiest first, stored 5 down to 1, each with its name", () => {
    expect(FEELINGS.map((each) => [each.value, each.emoji, each.name])).toEqual([
      [5, "😄", "Tosi hyvä"],
      [4, "🙂", "Hyvä"],
      [3, "😐", "Ihan ok"],
      [2, "🙁", "Huono"],
      [1, "😫", "Tosi huono"],
    ]);
    expect(emojiOf(4)).toBe("🙂");
    expect(emojiOf(null)).toBeUndefined();
  });
});

describe("markableOf", () => {
  const first = { id: "a", startsOn: "2026-10-20", weeks: 2 }; // ends 2.11.
  const second = { id: "b", startsOn: "2026-11-03", weeks: 2 }; // ends 16.11.
  const next = { id: "c", startsOn: "2026-11-17", weeks: 1 };
  const old = { id: "d", startsOn: "2026-10-06", weeks: 2 }; // ends 19.10.

  it("is the current period and the latest that ended before it", () => {
    expect(markableOf([old, first, second, next], "2026-11-05")).toEqual({
      current: second,
      previous: first,
    });
  });

  it("keeps the current period through its last day, and the next takes over the day after", () => {
    expect(markableOf([first, second, next], "2026-11-16")).toEqual({
      current: second,
      previous: first,
    });
    expect(markableOf([first, second, next], "2026-11-17")).toEqual({
      current: next,
      previous: second,
    });
  });

  it("with no current period, is only the latest that ended; the next is not markable", () => {
    expect(markableOf([old, first, next], "2026-11-10")).toEqual({
      current: undefined,
      previous: first,
    });
    expect(markableOf([next], "2026-11-10")).toEqual({ current: undefined, previous: undefined });
    expect(markableOf([], "2026-11-10")).toEqual({ current: undefined, previous: undefined });
  });

  it("has no previous period on the first day of the first one", () => {
    expect(markableOf([second], "2026-11-03")).toEqual({ current: second, previous: undefined });
  });
});

describe("pickOptions", () => {
  it("lists each library exercise once, at its first place", () => {
    expect(
      pickOptions([
        { exerciseId: "e2", name: "Lähdöt" },
        { exerciseId: "e1", name: "Tikkaat" },
        { exerciseId: "e2", name: "Lähdöt" },
      ])
    ).toEqual([
      { exerciseId: "e2", name: "Lähdöt" },
      { exerciseId: "e1", name: "Tikkaat" },
    ]);
  });
});
