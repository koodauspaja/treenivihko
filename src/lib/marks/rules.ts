/**
 * What a session's mark may be, read from its form with each field's Finnish
 * refusal, and which periods the child may mark on a day. The database checks
 * each column's rule again; the day's lower bound, the period's start, and
 * the picks' place in the session are the store's to check.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 */

import { wholeNumber } from "@/lib/exercises/rules";
import { isDay, lastDayOf } from "@/lib/periods/dates";
import { currentOf, latestOf, type PeriodDates } from "@/lib/periods/rules";
import { REFUSAL } from "./messages";

export const STATUSES = ["done", "partly", "not_done"] as const;
export type Status = (typeof STATUSES)[number];

/** The faces, happiest first, as the page shows them; `value` is what is stored. */
export const FEELINGS = [
  { value: 5, emoji: "😄", name: "Tosi hyvä" },
  { value: 4, emoji: "🙂", name: "Hyvä" },
  { value: 3, emoji: "😐", name: "Ihan ok" },
  { value: 2, emoji: "🙁", name: "Huono" },
  { value: 1, emoji: "😫", name: "Tosi huono" },
] as const;

export const PICKS = ["likedBest", "likedLeast", "easiest", "hardest"] as const;
export type PickKey = (typeof PICKS)[number];

/** A mark as it is stored: a library exercise's id for each pick, or null when skipped. */
export type Mark = {
  status: Status;
  trainedOn: string | null;
  feeling: number | null;
  picks: Record<PickKey, string | null>;
};

export const NO_PICKS: Record<PickKey, null> = {
  likedBest: null,
  likedLeast: null,
  easiest: null,
  hardest: null,
};

/** The emoji of a stored feeling. */
export const emojiOf = (feeling: number | null) =>
  FEELINGS.find((each) => each.value === feeling)?.emoji;

/** What the form sends, each field as text. */
export type MarkInput = {
  status: string;
  trainedOn: string;
  feeling: string;
  picks: Record<PickKey, string>;
};

export type MarkReading =
  | { ok: true; mark: Mark }
  | { ok: false; errors: Partial<Record<"status" | "trainedOn", string>> };

/**
 * A mark from its form, on `today`. A session not done keeps nothing else; a
 * face that is not one of the five, and an empty pick, are skipped.
 */
export function readMark(input: MarkInput, today: string): MarkReading {
  const status = STATUSES.find((each) => each === input.status);
  if (status === undefined) {
    return { ok: false, errors: { status: REFUSAL.status } };
  }
  if (status === "not_done") {
    return { ok: true, mark: { status, trainedOn: null, feeling: null, picks: NO_PICKS } };
  }
  const day = input.trainedOn.trim();
  if (!isDay(day)) {
    return { ok: false, errors: { trainedOn: REFUSAL.trainedOn } };
  }
  if (day > today) {
    return { ok: false, errors: { trainedOn: REFUSAL.outOfRange } };
  }
  const picks = { ...NO_PICKS } as Record<PickKey, string | null>;
  for (const pick of PICKS) {
    picks[pick] = input.picks[pick] === "" ? null : input.picks[pick];
  }
  return {
    ok: true,
    mark: { status, trainedOn: day, feeling: wholeNumber(input.feeling, 1, 5), picks },
  };
}

/**
 * The periods the child may mark on `day`: the current one, and the latest
 * that ended before it. The next period, before it starts, is neither.
 */
export function markableOf<T extends PeriodDates>(
  periods: readonly T[],
  day: string
): { current: T | undefined; previous: T | undefined } {
  return {
    current: currentOf(periods, day),
    previous: latestOf(periods.filter((each) => lastDayOf(each.startsOn, each.weeks) < day)),
  };
}

/** A session's exercises for the picks: each library exercise once, at its first place. */
export const pickOptions = <T extends { exerciseId: string }>(exercises: readonly T[]): T[] =>
  exercises.filter(
    (each, index) => exercises.findIndex((other) => other.exerciseId === each.exerciseId) === index
  );
