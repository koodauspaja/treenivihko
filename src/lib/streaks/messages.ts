/**
 * The Finnish the streak, the accomplishments and the pauses show, as the
 * spec gives it.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

import { formatDay, formatSpan, spanOf } from "@/lib/periods/dates";
import { weeksLabel } from "@/lib/periods/messages";
import type { Kind } from "./kinds";

export const STREAK_HEADING = "Putki";
export const ACCOMPLISHMENTS_HEADING = "Saavutukset";
export const NO_ACCOMPLISHMENTS = "Saavutuksia ei ole vielä.";
export const GOALS_HEADING = "Seuraavat tavoitteet";
export const KEEP_GOING = "Tee treeni tällä viikolla, niin putki jatkuu.";
export const START_STREAK = "Tee treeni tällä viikolla, niin putki alkaa.";

/** A count of weeks: `0 viikkoa`, `1 viikko`, `3 viikkoa`. */
const weeks = (count: number) => (count === 0 ? "0 viikkoa" : weeksLabel(count));

/** The streak's line on the child's side: `Putki: 3 viikkoa`. */
export const streakLine = (count: number) => `Putki: ${weeks(count)}`;
export const currentStreakLine = (count: number) => `Putki nyt: ${weeks(count)}`;
export const bestStreakLine = (count: number) => `Paras putki: ${weeks(count)}`;

/** A pause's days: its span, or its one day alone. */
export const pauseSpan = ({ startsOn, endsOn }: Readonly<{ startsOn: string; endsOn: string }>) =>
  startsOn === endsOn ? formatDay(startsOn) : formatSpan(startsOn, endsOn);

/** Under the streak while today is in a pause. */
export const pausedLine = (span: string) => `Tauko ${span}: putki ei katkea.`;

/** An accomplishment's name, from its kind and the parts it kept. */
export function accomplishmentName({
  kind,
  periodStartsOn,
  periodWeeks,
  exerciseName,
}: Readonly<{
  kind: Kind;
  periodStartsOn: string | null;
  periodWeeks: number | null;
  exerciseName: string | null;
}>): string {
  if (kind === "sessions_1") {
    return "Ensimmäinen treeni";
  }
  // The database holds a full period's dates and an exercise's name for those kinds.
  if (kind === "full_period") {
    return `Koko jakso tehty ${spanOf({ startsOn: periodStartsOn as string, weeks: periodWeeks as number })}`;
  }
  if (kind === "hard_to_easy") {
    return `Vaikeasta helpoksi: ${exerciseName as string}`;
  }
  const [what, count] = kind.split("_");
  return what === "sessions" ? `${count} treeniä` : `${count} viikon putki`;
}

/** A goal and its progress: `10 treeniä (7/10)`. */
export const goalLine = (name: string, have: number, goal: number) => `${name} (${have}/${goal})`;

export const PAUSES_HEADING = "Tauot";
export const PAUSES_INTRO = "Tauon aikana putki ei katkea.";
export const NO_PAUSES = "Taukoja ei ole.";
export const ADD_PAUSE = "Lisää tauko";

export const FIELD = { startsOn: "Alkaa", endsOn: "Päättyy" } as const;

export const confirmDeletePause = (span: string) => `Poistetaanko tauko ${span}?`;
export const pauseOverlapsWith = (span: string) => `Tauko menee päällekkäin tauon ${span} kanssa.`;

export const REFUSAL = {
  startsOn: "Anna alkamispäivä.",
  endsOn: "Anna päättymispäivä.",
  endsBeforeStart: "Tauko ei voi päättyä ennen alkuaan.",
  tooLong: "Tauko voi olla enintään 26 viikkoa.",
} as const;

/**
 * The streak's lines on the child's side: the streak when it is 1 or more,
 * then the pause's line while today is in one, or else the week's nudge.
 */
export function childStreakLines({
  current,
  thisWeekDone,
  pause,
}: Readonly<{ current: number; thisWeekDone: boolean; pause: string | null }>): string[] {
  const lines = current > 0 ? [streakLine(current)] : [];
  if (pause !== null) {
    return [...lines, pausedLine(pause)];
  }
  if (current === 0) {
    return [START_STREAK];
  }
  return thisWeekDone ? lines : [...lines, KEEP_GOING];
}
