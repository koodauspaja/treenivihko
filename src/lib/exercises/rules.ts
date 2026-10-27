/**
 * What an exercise may be, read from its form, and how the library shows and
 * filters it. Every write goes through it; the database checks each column's
 * rule again, not the rules across rows.
 *
 * decisions/f002-exercise-library.md
 */

import { characterCount, tidy } from "@/lib/text";
import { LABEL_KEYS, type LabelGroup, type LabelKey, labelOf, labelsIn } from "./labels";
import { REFUSAL } from "./messages";

export const NAME_MAX_LENGTH = 40;
export const INSTRUCTIONS_MAX_LENGTH = 1000;
export const VIDEO_URL_MAX_LENGTH = 500;
export const COUNT_MAX = 100;
export const SECONDS_MIN = 5;
export const SECONDS_MAX = 600;
export const SECONDS_STEP = 5;
export const DURATION_MAX_MINUTES = 30;

export type AmountKind = "count" | "time";
export type Level = 1 | 2 | 3;

export type Exercise = {
  name: string;
  instructions: string;
  videoUrl: string | null;
  amountKind: AmountKind;
  amount: number;
  durationMinutes: number;
  level: Level;
  warmUp: boolean;
  labels: LabelKey[];
};

declare const checked: unique symbol;

/**
 * An exercise that has passed every rule here. Only `readExercise` makes one,
 * and the store writes nothing else, so no write can go around the rules.
 */
export type CheckedExercise = Exercise & { readonly [checked]: true };

export type ExerciseField = keyof typeof REFUSAL;

/** The form's values as typed, to show again after a refusal. */
export type ExerciseValues = {
  name: string;
  instructions: string;
  videoUrl: string;
  // As sent: a kind that is neither is refused, not read as a count.
  amountKind: string;
  count: string;
  seconds: string;
  durationMinutes: string;
  level: string;
  warmUp: boolean;
  labels: string[];
};

export type ExerciseReading =
  | { ok: true; exercise: CheckedExercise }
  | { ok: false; errors: Partial<Record<ExerciseField, string>> };

const text = (form: FormData, field: string) => {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
};

/** A whole number written in digits only, within the range, or null. */
export function wholeNumber(input: string, min: number, max: number): number | null {
  if (!/^\d{1,6}$/.test(input.trim())) {
    return null;
  }
  const value = Number(input.trim());
  return value >= min && value <= max ? value : null;
}

/** The form as a new exercise starts. */
export const EMPTY_VALUES: ExerciseValues = {
  name: "",
  instructions: "",
  videoUrl: "",
  amountKind: "count",
  count: "",
  seconds: "",
  durationMinutes: "",
  level: "",
  warmUp: false,
  labels: [],
};

/** A stored exercise as its form shows it. */
export function valuesFrom(exercise: Exercise): ExerciseValues {
  return {
    name: exercise.name,
    instructions: exercise.instructions,
    videoUrl: exercise.videoUrl ?? "",
    amountKind: exercise.amountKind,
    count: exercise.amountKind === "count" ? String(exercise.amount) : "",
    seconds: exercise.amountKind === "time" ? String(exercise.amount) : "",
    durationMinutes: String(exercise.durationMinutes),
    level: String(exercise.level),
    warmUp: exercise.warmUp,
    labels: [...exercise.labels],
  };
}

/** The form's values as typed, before any rule. */
export function valuesOf(form: FormData): ExerciseValues {
  return {
    name: text(form, "name"),
    instructions: text(form, "instructions"),
    videoUrl: text(form, "videoUrl"),
    amountKind: text(form, "amountKind"),
    count: text(form, "count"),
    seconds: text(form, "seconds"),
    durationMinutes: text(form, "durationMinutes"),
    level: text(form, "level"),
    warmUp: form.get("warmUp") === "on",
    labels: form.getAll("label").filter((value): value is string => typeof value === "string"),
  };
}

/**
 * The video link as stored: null for none, or an address that starts with
 * `https://` exactly, as the database's check reads it, and parses.
 */
function videoUrlFrom(input: string): string | null | undefined {
  const trimmed = tidy(input);
  if (trimmed === "") {
    return null;
  }
  if (!trimmed.startsWith("https://") || characterCount(trimmed) > VIDEO_URL_MAX_LENGTH) {
    return undefined;
  }
  return URL.canParse(trimmed) ? trimmed : undefined;
}

/** Every rule of the spec's *The exercise*, each failing field with its Finnish refusal. */
export function readExercise(values: ExerciseValues): ExerciseReading {
  const errors: Partial<Record<ExerciseField, string>> = {};
  const name = tidy(values.name);
  if (characterCount(name) < 1 || characterCount(name) > NAME_MAX_LENGTH) {
    errors.name = REFUSAL.name;
  }
  const instructions = tidy(values.instructions);
  const instructionsLength = characterCount(instructions);
  if (instructionsLength < 1 || instructionsLength > INSTRUCTIONS_MAX_LENGTH) {
    errors.instructions = REFUSAL.instructions;
  }
  const videoUrl = videoUrlFrom(values.videoUrl);
  if (videoUrl === undefined) {
    errors.videoUrl = REFUSAL.videoUrl;
  }
  const amountKind: AmountKind | null =
    values.amountKind === "count" || values.amountKind === "time" ? values.amountKind : null;
  const amount =
    amountKind === "time"
      ? wholeNumber(values.seconds, SECONDS_MIN, SECONDS_MAX)
      : wholeNumber(values.count, 1, COUNT_MAX);
  if (amountKind === null) {
    errors.count = REFUSAL.count;
  } else if (amount === null || (amountKind === "time" && amount % SECONDS_STEP !== 0)) {
    errors[amountKind] = REFUSAL[amountKind];
  }
  const durationMinutes = wholeNumber(values.durationMinutes, 1, DURATION_MAX_MINUTES);
  if (durationMinutes === null) {
    errors.duration = REFUSAL.duration;
  }
  const level = wholeNumber(values.level, 1, 3);
  if (level === null) {
    errors.level = REFUSAL.level;
  }
  const keys = [...new Set(values.labels)];
  const known = keys.every((key) => labelOf(key) !== undefined);
  const has = (group: LabelGroup) => keys.some((key) => labelOf(key)?.group === group);
  // A key not on the list is refused outright, as no form offers one.
  if (!known || !has("skill")) {
    errors.skill = REFUSAL.skill;
  }
  if (!has("place")) {
    errors.place = REFUSAL.place;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    // The one place a CheckedExercise is made.
    exercise: {
      name,
      instructions,
      videoUrl: videoUrl ?? null,
      amountKind: amountKind as AmountKind,
      amount: amount as number,
      durationMinutes: durationMinutes as number,
      level: level as Level,
      warmUp: values.warmUp,
      labels: LABEL_KEYS.filter((key) => keys.includes(key)),
    } as CheckedExercise,
  };
}

/** An amount as the library shows it: `10 kertaa`, `1 kerta`, `30 s`, `1 min 30 s`. */
export function formatAmount(kind: AmountKind, amount: number): string {
  if (kind === "count") {
    return amount === 1 ? "1 kerta" : `${amount} kertaa`;
  }
  const minutes = Math.floor(amount / 60);
  const seconds = amount % 60;
  if (minutes === 0) {
    return `${seconds} s`;
  }
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

export const formatDuration = (minutes: number) => `${minutes} min`;

/** What the library's filters let through. */
export type Filters = {
  skills: readonly string[];
  places: readonly string[];
  equipment: readonly string[];
};

type Query = Record<string, string | string[] | undefined>;

const all = (query: Query, name: string): string[] => {
  const value = query[name];
  return value === undefined ? [] : [value].flat();
};

/** Marks a filter that was sent, so every equipment item unticked reads as none, not as all. */
export const FILTERED_PARAM = "rajaus";

/**
 * The filters from the address. Nothing sent means nothing filtered, with
 * every equipment item available; a key not on the list is ignored.
 */
export function filtersFrom(query: Query): Filters {
  const keysIn = (name: string, group: LabelGroup) => {
    const offered = new Set<string>(labelsIn(group).map((label) => label.key));
    return all(query, name).filter((key) => offered.has(key));
  };
  return {
    skills: keysIn("taito", "skill"),
    places: keysIn("paikka", "place"),
    equipment:
      query[FILTERED_PARAM] === undefined
        ? labelsIn("equipment").map((label) => label.key)
        : keysIn("valineet", "equipment"),
  };
}

/** Whether an exercise with `labels` passes all three filters. */
export function passes(labels: readonly string[], filters: Filters): boolean {
  const anyOf = (wanted: readonly string[], group: LabelGroup) =>
    wanted.length === 0 ||
    labels.some((key) => labelOf(key)?.group === group && wanted.includes(key));
  const needsOnlyAvailable = labels
    .filter((key) => labelOf(key)?.group === "equipment")
    .every((key) => filters.equipment.includes(key));
  return anyOf(filters.skills, "skill") && anyOf(filters.places, "place") && needsOnlyAvailable;
}

const finnish = new Intl.Collator("fi");

/** Names in Finnish alphabetical order, å, ä and ö after z. */
export const byFinnishName = (a: { name: string }, b: { name: string }) =>
  finnish.compare(a.name, b.name);
