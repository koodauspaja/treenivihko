/**
 * What a period, a session, a block and a block's amount may be, read from
 * their forms with each field's Finnish refusal, and the arithmetic the pages
 * show: a period's days, a session's length, and whether an exercise fits.
 * The database checks each column's rule again, not the rules across rows.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

import { LABEL_KEYS, type LabelKey, labelOf, labelsIn } from "@/lib/exercises/labels";
import { REFUSAL as EXERCISE_REFUSAL } from "@/lib/exercises/messages";
import {
  type AmountKind,
  COUNT_MAX,
  passes,
  SECONDS_MAX,
  SECONDS_MIN,
  SECONDS_STEP,
  wholeNumber,
} from "@/lib/exercises/rules";
import { characterCount, tidy, unstorable } from "@/lib/text";
import { addDays, type Day, isDay, lastDayOf } from "./dates";
import { REFUSAL } from "./messages";

export const WEEKS_MAX = 4;
export const SESSIONS_MAX = 20;
export const BLOCKS_MAX = 6;
export const BLOCK_EXERCISES_MAX = 10;
export const THEME_MAX_LENGTH = 30;
export const TARGET_MIN = 5;
export const TARGET_MAX = 120;
export const TARGET_STEP = 5;
export const DEFAULT_WEEKS = 2;
export const DEFAULT_TARGET = 45;
export const DEFAULT_PLACE: LabelKey = "field";

/** A period's days, as the database holds them. */
export type PeriodDates = { startsOn: Day; weeks: number };

export type PeriodDatesReading =
  | { ok: true; dates: PeriodDates }
  | { ok: false; errors: Partial<Record<"startsOn" | "weeks", string>> };

/** A period's start and length, from the form's values as typed. */
export function readPeriodDates(startsOn: string, weeks: string): PeriodDatesReading {
  const errors: Partial<Record<"startsOn" | "weeks", string>> = {};
  const day = startsOn.trim();
  const length = wholeNumber(weeks, 1, WEEKS_MAX);
  // A period ending past 9999 has a last day no page can show.
  if (!isDay(day) || !isDay(lastDayOf(day, length ?? 1))) {
    errors.startsOn = REFUSAL.startsOn;
  }
  if (length === null) {
    errors.weeks = REFUSAL.weeks;
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, dates: { startsOn: day, weeks: length as number } };
}

/** The period of `periods` that shares a day with `dates`, other than `except`, or none. */
export function overlapping<T extends PeriodDates & { id: string }>(
  periods: readonly T[],
  dates: PeriodDates,
  except?: string
): T | undefined {
  const last = lastDayOf(dates.startsOn, dates.weeks);
  return periods.find(
    (other) =>
      other.id !== except &&
      other.startsOn <= last &&
      dates.startsOn <= lastDayOf(other.startsOn, other.weeks)
  );
}

/** The period whose days include `day`, which no two share. */
export const currentOf = <T extends PeriodDates>(periods: readonly T[], day: Day): T | undefined =>
  periods.find(
    (period) => period.startsOn <= day && day <= lastDayOf(period.startsOn, period.weeks)
  );

/** The period that ends last, which a new one copies and follows. */
export const latestOf = <T extends PeriodDates>(periods: readonly T[]): T | undefined =>
  periods.reduce<T | undefined>(
    (latest, period) =>
      latest === undefined ||
      lastDayOf(period.startsOn, period.weeks) > lastDayOf(latest.startsOn, latest.weeks)
        ? period
        : latest,
    undefined
  );

/** A new period's form as it starts: the day after the latest ends and its length, or today for 2 weeks. */
export function newPeriodDates(latest: PeriodDates | undefined, day: Day): PeriodDates {
  return latest === undefined
    ? { startsOn: day, weeks: DEFAULT_WEEKS }
    : { startsOn: addDays(lastDayOf(latest.startsOn, latest.weeks), 1), weeks: latest.weeks };
}

/** A block's theme, trimmed as a nickname is, or null when it breaks the rule. */
export function readTheme(input: string): string | null {
  const theme = tidy(input);
  const length = characterCount(theme);
  return length >= 1 && length <= THEME_MAX_LENGTH && !unstorable(theme) ? theme : null;
}

/** A session's place, the equipment at hand, and its target length. */
export type SessionSettings = { place: LabelKey; equipment: LabelKey[]; targetMinutes: number };

export type SessionSettingsReading =
  | { ok: true; settings: SessionSettings }
  | { ok: false; errors: Partial<Record<"place" | "target", string>> };

const inGroup = (key: string, group: "place" | "equipment") => labelOf(key)?.group === group;

/** A session's settings from its form; an equipment key not on the list is dropped. */
export function readSessionSettings(
  place: string,
  equipment: readonly string[],
  target: string
): SessionSettingsReading {
  const errors: Partial<Record<"place" | "target", string>> = {};
  if (!inGroup(place, "place")) {
    errors.place = REFUSAL.place;
  }
  const minutes = wholeNumber(target, TARGET_MIN, TARGET_MAX);
  if (minutes === null || minutes % TARGET_STEP !== 0) {
    errors.target = REFUSAL.target;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    settings: {
      place: place as LabelKey,
      equipment: LABEL_KEYS.filter((key) => equipment.includes(key) && inGroup(key, "equipment")),
      targetMinutes: minutes as number,
    },
  };
}

/** A new session's settings: the field, every item at hand, 45 minutes. */
export const NEW_SESSION: SessionSettings = {
  place: DEFAULT_PLACE,
  equipment: labelsIn("equipment").map((label) => label.key as LabelKey),
  targetMinutes: DEFAULT_TARGET,
};

/** A block exercise's amount, by its kind's rule from Feature 002, or its refusal. */
export function readBlockAmount(
  kind: AmountKind,
  input: string
): { ok: true; amount: number } | { ok: false; error: string } {
  if (kind === "count") {
    const count = wholeNumber(input, 1, COUNT_MAX);
    return count === null
      ? { ok: false, error: EXERCISE_REFUSAL.count }
      : { ok: true, amount: count };
  }
  const seconds = wholeNumber(input, SECONDS_MIN, SECONDS_MAX);
  return seconds === null || seconds % SECONDS_STEP !== 0
    ? { ok: false, error: EXERCISE_REFUSAL.time }
    : { ok: true, amount: seconds };
}

/** Whether an exercise with `labels` can be done at the session's place with what is at hand. */
export const fits = (labels: readonly string[], place: string, equipment: readonly string[]) =>
  passes(labels, { skills: [], places: [place], equipment });

/** A session's length: the sum of its exercises' durations. */
export const totalMinutes = (exercises: readonly { durationMinutes: number }[]) =>
  exercises.reduce((total, exercise) => total + exercise.durationMinutes, 0);

/** How far a session's length goes over its target, or null when it does not. */
export const overBy = (total: number, target: number) => (total > target ? total - target : null);
