/**
 * The streak and the accomplishments: what each week is, how long the streak
 * and the best streak are, what has been earned and what is next, and what
 * a pause may be, read from its form with each field's Finnish refusal. The
 * database checks a pause's rules again, and the overlap.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 * decisions/f008-streaks-and-accomplishments.md
 */

import { byFinnishName } from "@/lib/exercises/rules";
import type { Status } from "@/lib/marks/rules";
import { addDays, isDay, lastDayOf } from "@/lib/periods/dates";
import type { PeriodDates } from "@/lib/periods/rules";
import { KINDS, type Kind, SESSION_GOALS, STREAK_GOALS, sessionKind, streakKind } from "./kinds";
import { REFUSAL } from "./messages";

/** The longest pause, its first and last day included. */
export const PAUSE_DAYS_MAX = 182;

/** A pause's days, its first and last included. */
export type PauseDays = { startsOn: string; endsOn: string };

export type PauseReading =
  | { ok: true; pause: PauseDays }
  | { ok: false; errors: Partial<Record<"startsOn" | "endsOn", string>> };

/** A pause from its form's values as typed. */
export function readPause(startsOn: string, endsOn: string): PauseReading {
  const start = startsOn.trim();
  const end = endsOn.trim();
  const errors: Partial<Record<"startsOn" | "endsOn", string>> = {};
  if (!isDay(start)) {
    errors.startsOn = REFUSAL.startsOn;
  }
  if (!isDay(end)) {
    errors.endsOn = REFUSAL.endsOn;
  } else if (errors.startsOn === undefined && end < start) {
    errors.endsOn = REFUSAL.endsBeforeStart;
  } else if (errors.startsOn === undefined && end > addDays(start, PAUSE_DAYS_MAX - 1)) {
    errors.endsOn = REFUSAL.tooLong;
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, pause: { startsOn: start, endsOn: end } };
}

/** Whether two spans of days, first and last included, share one. */
const sharesDay = (a: PauseDays, b: PauseDays) => a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;

/** The pause of `pauses` that shares a day with `pause`, or none. */
export const overlappingPause = <T extends PauseDays>(
  pauses: readonly T[],
  pause: PauseDays
): T | undefined => pauses.find((other) => sharesDay(other, pause));

/** The pause that includes `day`, or none; no two share one. */
export const pauseOn = <T extends PauseDays>(pauses: readonly T[], day: string): T | undefined =>
  pauses.find((pause) => pause.startsOn <= day && day <= pause.endsOn);

/** The Monday of `day`'s week, which runs Monday to Sunday. */
export const mondayOf = (day: string) =>
  addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

export type Streak = { current: number; best: number; thisWeekDone: boolean };

/**
 * The streak on `day`: done weeks counted back from the current one, a
 * neutral week skipped, up to the first missed week; and the longest such
 * run ever. A week is done with a session done in it; neutral when not done
 * but paused on any day, covered by no period, or the current week; else missed.
 */
export function streakOf({
  day,
  doneDays,
  periods,
  pauses,
}: Readonly<{
  day: string;
  doneDays: readonly string[];
  periods: readonly PeriodDates[];
  pauses: readonly PauseDays[];
}>): Streak {
  const thisWeek = mondayOf(day);
  const doneWeeks = new Set(doneDays.map(mondayOf));
  const spans = periods.map((each) => ({
    startsOn: each.startsOn,
    endsOn: lastDayOf(each.startsOn, each.weeks),
  }));
  // Every week before the first period or the first session done is covered by no period and neutral.
  const first = [...spans.map((each) => each.startsOn), ...doneDays].sort()[0];
  let current = 0;
  let best = 0;
  if (first === undefined) {
    return { current, best, thisWeekDone: false };
  }
  for (let week = mondayOf(first); week <= thisWeek; week = addDays(week, 7)) {
    const days = { startsOn: week, endsOn: addDays(week, 6) };
    if (doneWeeks.has(week)) {
      current += 1;
      best = Math.max(best, current);
    } else if (
      week !== thisWeek &&
      !pauses.some((pause) => sharesDay(pause, days)) &&
      spans.some((span) => sharesDay(span, days))
    ) {
      current = 0;
    }
  }
  return { current, best, thisWeekDone: doneWeeks.has(thisWeek) };
}

/** A session as the accomplishments read it: its period, and its mark's status, day and two picks. */
export type MarkedSession = {
  periodId: string;
  status: Status | null;
  trainedOn: string | null;
  easiest: string | null;
  hardest: string | null;
};

/** An accomplishment due: its kind and key, and its name's parts for the keyed kinds. */
export type Due = {
  kind: Kind;
  key: string;
  periodStartsOn: string | null;
  periodWeeks: number | null;
  exerciseId: string | null;
};

const due = (kind: Kind, extra: Partial<Due> = {}): Due => ({
  kind,
  key: "",
  periodStartsOn: null,
  periodWeeks: null,
  exerciseId: null,
  ...extra,
});

/** How many sessions were done, in full or in part. */
export const sessionsDone = (sessions: readonly Pick<MarkedSession, "status">[]) =>
  sessions.filter((each) => each.status === "done" || each.status === "partly").length;

/** The exercises once picked as hardest, then as easiest on a later day. */
function hardToEasy(sessions: readonly MarkedSession[]): string[] {
  const firstHardest = new Map<string, string>();
  const lastEasiest = new Map<string, string>();
  for (const { trainedOn, easiest, hardest } of sessions) {
    // A mark with no day has no picks; the database holds that.
    if (trainedOn === null) {
      continue;
    }
    const hardDay = hardest === null ? undefined : firstHardest.get(hardest);
    if (hardest !== null && (hardDay === undefined || trainedOn < hardDay)) {
      firstHardest.set(hardest, trainedOn);
    }
    const easyDay = easiest === null ? undefined : lastEasiest.get(easiest);
    if (easiest !== null && (easyDay === undefined || trainedOn > easyDay)) {
      lastEasiest.set(easiest, trainedOn);
    }
  }
  return [...firstHardest]
    .filter(([id, day]) => {
      const easyDay = lastEasiest.get(id);
      return easyDay !== undefined && day < easyDay;
    })
    .map(([id]) => id);
}

/**
 * The accomplishments the facts earn that `earned` does not hold yet, by
 * `kind|key`, in the kinds' order.
 */
export function dueOf({
  sessions,
  periods,
  best,
  earned,
}: Readonly<{
  sessions: readonly MarkedSession[];
  periods: readonly (PeriodDates & { id: string })[];
  best: number;
  earned: ReadonlySet<string>;
}>): Due[] {
  const done = sessionsDone(sessions);
  const all: Due[] = [
    ...SESSION_GOALS.filter((goal) => done >= goal).map((goal) => due(sessionKind(goal))),
    ...STREAK_GOALS.filter((goal) => best >= goal).map((goal) => due(streakKind(goal))),
  ];
  for (const period of periods) {
    const its = sessions.filter((each) => each.periodId === period.id);
    if (its.length > 0 && its.every((each) => each.status === "done")) {
      all.push(
        due("full_period", {
          key: period.id,
          periodStartsOn: period.startsOn,
          periodWeeks: period.weeks,
        })
      );
    }
  }
  for (const id of hardToEasy(sessions)) {
    all.push(due("hard_to_easy", { key: id, exerciseId: id }));
  }
  return all.filter((each) => !earned.has(earnedKey(each)));
}

/** An accomplishment's identity among a parent's, as the unique key holds it. */
export const earnedKey = ({ kind, key }: Readonly<{ kind: string; key: string }>) =>
  `${kind}|${key}`;

/** An earned accomplishment as the page shows it. */
export type Earned = {
  id: string;
  kind: Kind;
  earnedOn: string;
  periodStartsOn: string | null;
  periodWeeks: number | null;
  exerciseName: string | null;
};

/**
 * Newest first; within a day in the kinds' order, then by period, then by
 * exercise name in Finnish order. Within a kind, a period's start and an
 * exercise's name are both set or both null, so `String` compares like with like.
 */
export const byEarned = (a: Earned, b: Earned) =>
  b.earnedOn.localeCompare(a.earnedOn) ||
  KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) ||
  String(a.periodStartsOn).localeCompare(String(b.periodStartsOn)) ||
  byFinnishName({ name: String(a.exerciseName) }, { name: String(b.exerciseName) });

export type Goal = { kind: Kind; have: number; goal: number };

/** The next session count and the next streak length not earned, each with its progress. */
export function goalsOf({
  earned,
  done,
  streak,
}: Readonly<{ earned: ReadonlySet<string>; done: number; streak: number }>): Goal[] {
  const goals: Goal[] = [];
  const session = SESSION_GOALS.find(
    (goal) => !earned.has(earnedKey({ kind: sessionKind(goal), key: "" }))
  );
  if (session !== undefined) {
    goals.push({ kind: sessionKind(session), have: done, goal: session });
  }
  const length = STREAK_GOALS.find(
    (goal) => !earned.has(earnedKey({ kind: streakKind(goal), key: "" }))
  );
  if (length !== undefined) {
    goals.push({ kind: streakKind(length), have: streak, goal: length });
  }
  return goals;
}
