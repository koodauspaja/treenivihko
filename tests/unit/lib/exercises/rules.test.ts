import { describe, expect, it } from "vitest";
import {
  byFinnishName,
  type CheckedExercise,
  EMPTY_VALUES,
  type Exercise,
  type ExerciseValues,
  filtersFrom,
  formatAmount,
  formatDuration,
  passes,
  readExercise,
  valuesFrom,
  valuesOf,
  wholeNumber,
} from "@/lib/exercises/rules";
import type { createExercise, updateExercise } from "@/lib/exercises/store";

const VALID: ExerciseValues = {
  name: "Tikkaat",
  instructions: "Tee näin.",
  videoUrl: "",
  amountKind: "count",
  count: "10",
  seconds: "",
  durationMinutes: "5",
  level: "2",
  warmUp: true,
  labels: ["footwork", "field", "ladder"],
};

/** Null for an accepted exercise, its refusals for a refused one, so the two never read the same. */
const errorsOf = (changes: Partial<ExerciseValues>) => {
  const reading = readExercise({ ...VALID, ...changes });
  return reading.ok ? null : reading.errors;
};

describe("wholeNumber", () => {
  it.each([
    ["5", 5],
    [" 7 ", 7],
    ["", null],
    ["0x10", null],
    ["2abc", null],
    ["1.5", null],
    ["-1", null],
    ["1e2", null],
    ["9999999", null],
  ])("reads %j as %j within 0–100", (input, expected) => {
    expect(wholeNumber(input, 0, 100)).toBe(expected);
  });

  it("refuses a number outside the range", () => {
    expect(wholeNumber("101", 0, 100)).toBeNull();
  });
});

describe("readExercise", () => {
  it("reads a valid exercise, trimmed, with the labels in the list's order", () => {
    expect(
      readExercise({ ...VALID, name: "  Tikkaat ", labels: ["ladder", "field", "footwork"] })
    ).toEqual({
      ok: true,
      exercise: {
        name: "Tikkaat",
        instructions: "Tee näin.",
        videoUrl: null,
        amountKind: "count",
        amount: 10,
        durationMinutes: 5,
        level: 2,
        warmUp: true,
        labels: ["footwork", "field", "ladder"],
      },
    });
  });

  it.each([
    ["", "Nimessä on oltava 1–40 merkkiä."],
    ["   ", "Nimessä on oltava 1–40 merkkiä."],
    ["x".repeat(41), "Nimessä on oltava 1–40 merkkiä."],
  ])("refuses the name %j", (name, message) => {
    expect(errorsOf({ name })).toEqual({ name: message });
  });

  it("accepts names of 1 and 40 characters", () => {
    expect(errorsOf({ name: "x" })).toBeNull();
    expect(errorsOf({ name: "x".repeat(40) })).toBeNull();
  });

  it("takes instructions of 1 to 1000 characters, line breaks kept", () => {
    expect(errorsOf({ instructions: "" })).toEqual({
      instructions: "Ohjeessa on oltava 1–1000 merkkiä.",
    });
    expect(errorsOf({ instructions: "x".repeat(1001) })).toEqual({
      instructions: "Ohjeessa on oltava 1–1000 merkkiä.",
    });
    expect(errorsOf({ instructions: "x" })).toBeNull();
    expect(errorsOf({ instructions: "x".repeat(1000) })).toBeNull();
    const reading = readExercise({ ...VALID, instructions: " yksi\nkaksi " });
    expect(reading.ok && reading.exercise.instructions).toBe("yksi\nkaksi");
  });

  it.each([
    ["http://example.com", false],
    ["javascript:alert(1)", false],
    ["HTTPS://example.com", false],
    ["https:example.com", false],
    ["https://", false],
    [`https://example.com/${"😀".repeat(480)}`, true],
    ["not a link", false],
    [`https://example.com/${"x".repeat(481)}`, false],
    [`https://example.com/${"x".repeat(480)}`, true],
    ["https://example.com/video", true],
  ])("a video link %j is accepted: %s", (videoUrl, accepted) => {
    expect(errorsOf({ videoUrl })).toEqual(
      accepted ? null : { videoUrl: "Videolinkin on oltava https-osoite." }
    );
  });

  it("refuses U+0000, which Postgres cannot store, in every text field", () => {
    expect(errorsOf({ name: "Tik\u0000kaat" })).toEqual({
      name: "Nimessä on oltava 1–40 merkkiä.",
    });
    expect(errorsOf({ instructions: "Tee\u0000näin." })).toEqual({
      instructions: "Ohjeessa on oltava 1–1000 merkkiä.",
    });
    expect(errorsOf({ videoUrl: "https://example.com/\u0000" })).toEqual({
      videoUrl: "Videolinkin on oltava https-osoite.",
    });
  });

  it("counts a video link as stored, since it is never normalised", () => {
    const base = "https://example.com/";
    const decomposed = `${base}${"a\u0308".repeat(240)}`;
    expect(decomposed.length).toBe(500);
    expect(errorsOf({ videoUrl: decomposed })).toBeNull();
    expect(errorsOf({ videoUrl: `${decomposed}x` })).toEqual({
      videoUrl: "Videolinkin on oltava https-osoite.",
    });
  });

  it("counts a line break in the instructions as one character, however the browser sent it", () => {
    const lines = Array.from({ length: 10 }, () => "x".repeat(99)).join("\r\n");
    expect(lines.length).toBe(1008);
    const reading = readExercise({ ...VALID, instructions: lines });
    expect(reading.ok && reading.exercise.instructions.length).toBe(999);
  });

  it("keeps a video link as typed, only trimmed, never normalised", () => {
    const decomposed = "https://example.com/A\u0308";
    const reading = readExercise({ ...VALID, videoUrl: ` ${decomposed} ` });
    expect(reading.ok && reading.exercise.videoUrl).toBe(decomposed);
  });

  it("stores no video link for an empty one", () => {
    const reading = readExercise({ ...VALID, videoUrl: "  " });
    expect(reading.ok && reading.exercise.videoUrl).toBeNull();
  });

  it.each([
    ["0", false],
    ["1", true],
    ["100", true],
    ["101", false],
    ["", false],
  ])("a count of %j is accepted: %s", (count, accepted) => {
    expect(errorsOf({ count })).toEqual(accepted ? null : { count: "Kertoja on oltava 1–100." });
  });

  it.each([
    ["0", false],
    ["5", true],
    ["7", false],
    ["600", true],
    ["605", false],
  ])("a time of %j seconds is accepted: %s", (seconds, accepted) => {
    expect(errorsOf({ amountKind: "time", count: "", seconds })).toEqual(
      accepted ? null : { time: "Ajan on oltava 5 s – 10 min, 5 sekunnin välein." }
    );
  });

  it.each(["laps", ""])("refuses an amount kind %j that is neither", (amountKind) => {
    expect(errorsOf({ amountKind })).toEqual({ count: "Kertoja on oltava 1–100." });
  });

  it("reads only the chosen amount's field", () => {
    const reading = readExercise({ ...VALID, amountKind: "time", count: "999", seconds: "30" });
    expect(reading.ok && [reading.exercise.amountKind, reading.exercise.amount]).toEqual([
      "time",
      30,
    ]);
  });

  it.each([
    ["0", false],
    ["1", true],
    ["30", true],
    ["31", false],
  ])("a duration of %j minutes is accepted: %s", (durationMinutes, accepted) => {
    expect(errorsOf({ durationMinutes })).toEqual(
      accepted ? null : { duration: "Keston on oltava 1–30 minuuttia." }
    );
  });

  it.each(["", "0", "4"])("refuses the level %j", (level) => {
    expect(errorsOf({ level })).toEqual({ level: "Valitse taso." });
  });

  it("needs a skill and a place, and refuses a key not on the list", () => {
    expect(errorsOf({ labels: ["field"] })).toEqual({ skill: "Valitse vähintään yksi taito." });
    expect(errorsOf({ labels: ["footwork"] })).toEqual({ place: "Valitse vähintään yksi paikka." });
    expect(errorsOf({ labels: ["footwork", "field", "heading"] })).toEqual({
      skill: "Valitse vähintään yksi taito.",
    });
    expect(errorsOf({ labels: ["footwork", "field"] })).toBeNull();
  });

  it("names every failing field at once", () => {
    expect(Object.keys(errorsOf({ name: "", level: "", labels: [] }) ?? {}).sort()).toEqual([
      "level",
      "name",
      "place",
      "skill",
    ]);
  });
});

describe("the form's values", () => {
  it("reads what was typed, with the amount kind count unless time is chosen", () => {
    const form = new FormData();
    form.set("name", "Tikkaat");
    form.set("amountKind", "time");
    form.set("seconds", "30");
    form.set("warmUp", "on");
    form.append("label", "footwork");
    form.append("label", "field");
    expect(valuesOf(form)).toEqual({
      ...EMPTY_VALUES,
      name: "Tikkaat",
      amountKind: "time",
      seconds: "30",
      warmUp: true,
      labels: ["footwork", "field"],
    });
    expect(valuesOf(new FormData())).toEqual({ ...EMPTY_VALUES, amountKind: "" });
  });

  it("shows a stored exercise in its form, the amount in its own field", () => {
    const reading = readExercise({ ...VALID, videoUrl: "https://example.com/v" });
    if (!reading.ok) {
      throw new Error("the fixture is valid");
    }
    expect(valuesFrom(reading.exercise)).toEqual({ ...VALID, videoUrl: "https://example.com/v" });
    expect(
      valuesFrom({ ...reading.exercise, amountKind: "time", amount: 30, videoUrl: null })
    ).toMatchObject({
      count: "",
      seconds: "30",
      videoUrl: "",
    });
  });
});

describe("the display", () => {
  it.each([
    ["count", 1, "1 kerta"],
    ["count", 10, "10 kertaa"],
    ["time", 30, "30 s"],
    ["time", 60, "1 min"],
    ["time", 90, "1 min 30 s"],
    ["time", 600, "10 min"],
  ] as const)("a %s of %i reads %j", (kind, amount, text) => {
    expect(formatAmount(kind, amount)).toBe(text);
  });

  it("shows a duration in minutes", () => {
    expect(formatDuration(5)).toBe("5 min");
  });

  it("sorts names in Finnish order, å, ä and ö after z", () => {
    const names = ["Ärrä", "Zeta", "Öljy", "ankka", "Åke", "Bee"].map((name) => ({ name }));
    expect(names.sort(byFinnishName).map((each) => each.name)).toEqual([
      "ankka",
      "Bee",
      "Zeta",
      "Åke",
      "Ärrä",
      "Öljy",
    ]);
  });
});

describe("the filters", () => {
  const ALL_EQUIPMENT = ["ball", "ladder", "hurdles", "cones", "goal", "wall", "jump_rope"];

  it("filter nothing when nothing was sent, with every equipment item available", () => {
    expect(filtersFrom({})).toEqual({ skills: [], places: [], equipment: ALL_EQUIPMENT });
  });

  it("read the ticked keys, ignoring keys not on their group's list", () => {
    expect(
      filtersFrom({
        taito: ["dribbling", "field"],
        paikka: "gym",
        valineet: ["goal", "heading"],
        rajaus: "1",
      })
    ).toEqual({ skills: ["dribbling"], places: ["gym"], equipment: ["goal"] });
  });

  it("read every equipment item unticked as none available", () => {
    expect(filtersFrom({ rajaus: "1" }).equipment).toEqual([]);
  });

  const none = { skills: [], places: [], equipment: ALL_EQUIPMENT };

  it("pass everything when nothing is ticked", () => {
    expect(passes(["dribbling", "field", "goal"], none)).toBe(true);
  });

  it("pass an exercise with any ticked skill, and any ticked place", () => {
    const filters = { ...none, skills: ["dribbling", "shooting"], places: ["gym"] };
    expect(passes(["shooting", "gym"], filters)).toBe(true);
    expect(passes(["passing", "gym"], filters)).toBe(false);
    expect(passes(["shooting", "field"], filters)).toBe(false);
  });

  it("pass an exercise only when every item it needs is available", () => {
    const noGoal = { ...none, equipment: ALL_EQUIPMENT.filter((key) => key !== "goal") };
    expect(passes(["shooting", "field", "ball"], noGoal)).toBe(true);
    expect(passes(["shooting", "field", "ball", "goal"], noGoal)).toBe(false);
    const nothing = { ...none, equipment: [] };
    expect(passes(["speed", "field"], nothing)).toBe(true);
    expect(passes(["speed", "field", "cones"], nothing)).toBe(false);
  });
});

describe("a checked exercise", () => {
  it("is made by readExercise only: a plain one is not accepted where a checked one is", () => {
    const reading = readExercise(VALID);
    const plain: Exercise = reading.ok ? { ...reading.exercise } : (undefined as never);
    // @ts-expect-error a plain Exercise has not passed readExercise
    const unchecked: CheckedExercise = plain;
    expect(reading.ok && unchecked.name).toBe("Tikkaat");
  });

  it("is what the store's writes take, and nothing less", () => {
    const plain = { ...VALID } as unknown as Exercise;
    // @ts-expect-error createExercise writes only a checked exercise
    const created: Parameters<typeof createExercise>[1] = plain;
    // @ts-expect-error updateExercise writes only a checked exercise
    const updated: Parameters<typeof updateExercise>[2] = plain;
    expect([created, updated]).toHaveLength(2);
  });
});
