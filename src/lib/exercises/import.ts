/**
 * An import of exercises: the spec's JSON format read into exercises checked
 * by the library's own rules, all or nothing, with every failing exercise
 * and each of its reasons.
 *
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 */

import { tidy } from "@/lib/text";
import {
  EXERCISE_REASON,
  type ImportRefusal,
  notAList,
  unknownField,
  unknownLabel,
} from "./import-messages";
import { type LabelGroup, labelsIn } from "./labels";
import { REFUSAL } from "./messages";
import { type CheckedExercise, type ExerciseValues, readExercise } from "./rules";

export const IMPORT_MAX_EXERCISES = 100;
// 500 kt as a person reads it.
export const IMPORT_MAX_BYTES = 500_000;

export type ImportText = { ok: true; text: string } | { ok: false; refusal: ImportRefusal };

/**
 * The import's text: a chosen file's bytes, decoded as UTF-8 with any byte
 * order mark dropped, or the pasted text. Exactly one of the two, within the
 * size limit, before anything is parsed.
 */
export function importText(file: Uint8Array | null, pasted: string): ImportText {
  const hasText = pasted.trim() !== "";
  if (file === null && !hasText) {
    return { ok: false, refusal: "empty" };
  }
  if (file !== null && hasText) {
    return { ok: false, refusal: "both" };
  }
  const bytes = file ?? new TextEncoder().encode(pasted);
  if (bytes.length > IMPORT_MAX_BYTES) {
    return { ok: false, refusal: "size" };
  }
  if (file === null) {
    return { ok: true, text: pasted.replace(/^\uFEFF/, "") };
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(file) };
  } catch {
    return { ok: false, refusal: "encoding" };
  }
}

export type FailingExercise = { position: number; name: string | null; reasons: string[] };

export type ImportReading =
  | { ok: true; exercises: CheckedExercise[] }
  | { ok: false; refusal: ImportRefusal }
  | { ok: false; failing: FailingExercise[]; total: number };

// Stands in for a number not written in digits only, such as 2.0 or 1e2,
// which no field accepts, as the form accepts only digits.
const NOT_WHOLE = Symbol("not a whole number");

// Node 24 gives a reviver each primitive's source text, which TypeScript's
// signature leaves out.
function wholeNumbersOnly(_key: string, value: unknown, context: { source: string }) {
  return typeof value === "number" && !/^-?\d+$/.test(context.source) ? NOT_WHOLE : value;
}

const parse = (text: string): unknown =>
  JSON.parse(text, wholeNumbersOnly as (key: string, value: unknown) => unknown);

const FIELDS = new Set([
  "nimi",
  "ohje",
  "videolinkki",
  "kertaa",
  "sekuntia",
  "kesto_min",
  "taso",
  "lammittely",
  "taidot",
  "paikat",
  "valineet",
]);

const LIST_FIELD: Record<LabelGroup, string> = {
  skill: "taidot",
  place: "paikat",
  equipment: "valineet",
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOf = (value: unknown) => (typeof value === "string" ? value : "");

// A wrong type reads as nothing typed, which the field's own rule refuses.
const wholeOf = (value: unknown) => (typeof value === "number" ? String(value) : "");

/** How the import compares names, as the library's unique index does by its lowercase. */
const folded = (name: string) => name.toLowerCase();

type Reading = {
  name: string | null;
  // The exercise's name as the library would hold it, when its rule passes.
  key: string | null;
  // The reasons before and after those about its name being in use.
  before: string[];
  after: string[];
  exercise: CheckedExercise | null;
};

/** A group's label keys from the names listed, and a reason for each it cannot read. */
function labelsFrom(group: LabelGroup, value: unknown, reasons: string[]): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((name) => typeof name === "string")) {
    reasons.push(notAList(group));
    return [];
  }
  const keys: string[] = [];
  for (const name of value as string[]) {
    const wanted = folded(name.trim());
    const label = labelsIn(group).find((each) => folded(each.name) === wanted);
    if (label === undefined) {
      reasons.push(unknownLabel(group, name.trim()));
    } else {
      keys.push(label.key);
    }
  }
  return keys;
}

/**
 * Why an exercise's amount fails: exactly one of the two is needed, and each
 * given also has to meet its own rule, which the form checks one at a time.
 */
function amountReasons(
  values: ExerciseValues,
  hasCount: boolean,
  hasSeconds: boolean,
  errors: Partial<Record<string, string>>
): (string | undefined)[] {
  if (!hasCount && !hasSeconds) {
    return [EXERCISE_REASON.amount];
  }
  if (!(hasCount && hasSeconds)) {
    return [errors.count, errors.time];
  }
  const asTime = readExercise({ ...values, amountKind: "time" });
  return [EXERCISE_REASON.amount, errors.count, asTime.ok ? undefined : asTime.errors.time];
}

/** One exercise of the import, by Feature 002's rules and the format's own. */
function readOne(item: unknown): Reading {
  if (!isObject(item)) {
    return {
      name: null,
      key: null,
      before: [EXERCISE_REASON.notObject],
      after: [],
      exercise: null,
    };
  }
  const hasCount = Object.hasOwn(item, "kertaa");
  const hasSeconds = Object.hasOwn(item, "sekuntia");
  const video = item.videolinkki ?? "";
  // Only a field left out is false; null is a value, and not one it takes.
  const warmUp = item.lammittely === undefined ? false : item.lammittely;
  const labelReasons: string[] = [];
  const labels = (["skill", "place", "equipment"] as const).flatMap((group) =>
    labelsFrom(group, item[LIST_FIELD[group]], labelReasons)
  );
  const values: ExerciseValues = {
    name: textOf(item.nimi),
    instructions: textOf(item.ohje),
    videoUrl: textOf(video),
    amountKind: hasSeconds && !hasCount ? "time" : "count",
    count: wholeOf(item.kertaa),
    seconds: wholeOf(item.sekuntia),
    durationMinutes: wholeOf(item.kesto_min),
    level: wholeOf(item.taso),
    warmUp: warmUp === true,
    labels,
  };
  const reading = readExercise(values);
  const errors = reading.ok ? {} : reading.errors;

  const present = (reasons: (string | undefined)[]) =>
    reasons.filter((reason) => reason !== undefined);
  // In the fields' order; a wrong type is refused here where the form never meets one.
  const before = present([
    ...Object.keys(item)
      .filter((field) => !FIELDS.has(field))
      .map(unknownField),
    errors.name,
  ]);
  const after = present([
    errors.instructions,
    typeof video === "string" ? errors.videoUrl : REFUSAL.videoUrl,
    ...amountReasons(values, hasCount, hasSeconds, errors),
    errors.duration,
    errors.level,
    typeof warmUp === "boolean" ? undefined : EXERCISE_REASON.warmUp,
    ...labelReasons,
    errors.skill,
    errors.place,
  ]);

  const name = typeof item.nimi === "string" && tidy(item.nimi) !== "" ? tidy(item.nimi) : null;
  return {
    name,
    key: errors.name === undefined ? folded(tidy(values.name)) : null,
    before,
    after,
    exercise: reading.ok && before.length === 0 && after.length === 0 ? reading.exercise : null,
  };
}

/**
 * The import's text read against the library's names: every exercise checked,
 * and either all of them, or every one that fails, by its position from 1.
 */
export function readImport(text: string, libraryNames: readonly string[]): ImportReading {
  let list: unknown;
  try {
    list = parse(text);
  } catch {
    return { ok: false, refusal: "json" };
  }
  if (!Array.isArray(list)) {
    return { ok: false, refusal: "shape" };
  }
  if (list.length === 0) {
    return { ok: false, refusal: "none" };
  }
  if (list.length > IMPORT_MAX_EXERCISES) {
    return { ok: false, refusal: "count" };
  }
  const inLibrary = new Set(libraryNames.map(folded));
  const earlier = new Set<string>();
  const failing: FailingExercise[] = [];
  const exercises: CheckedExercise[] = [];
  list.forEach((item, index) => {
    const reading = readOne(item);
    const inUse: string[] = [];
    if (reading.key !== null) {
      if (inLibrary.has(reading.key)) {
        inUse.push(REFUSAL.nameInUse);
      }
      if (earlier.has(reading.key)) {
        inUse.push(EXERCISE_REASON.nameEarlier);
      }
      earlier.add(reading.key);
    }
    // A label listed twice, unknown, is one reason.
    const reasons = [...new Set([...reading.before, ...inUse, ...reading.after])];
    if (reading.exercise !== null && reasons.length === 0) {
      exercises.push(reading.exercise);
    } else {
      failing.push({ position: index + 1, name: reading.name, reasons });
    }
  });
  return failing.length === 0
    ? { ok: true, exercises }
    : { ok: false, failing, total: list.length };
}
