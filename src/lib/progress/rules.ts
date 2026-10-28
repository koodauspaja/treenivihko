/**
 * What the child's progress shows: the periods that have started, newest
 * first, how many of a period's sessions were done, and each picked
 * exercise's counts, in the spec's order.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 * decisions/f007-progress.md
 */

import { byFinnishName } from "@/lib/exercises/rules";
import { PICKS, type PickKey, type Status } from "@/lib/marks/rules";
import type { PeriodDates } from "@/lib/periods/rules";

export type PickCounts = Record<PickKey, number>;

/** A picked exercise, by its current name, with how many times it got each pick. */
export type ExerciseCounts = { exerciseId: string; name: string; counts: PickCounts };

/** The periods whose start is `day` or earlier, newest first; no two start on one day. */
export const startedOf = <T extends PeriodDates>(periods: readonly T[], day: string): T[] =>
  periods
    .filter((period) => period.startsOn <= day)
    .sort((a, b) => (a.startsOn < b.startsOn ? 1 : -1));

/** How many of the sessions were done, in full or in part. */
export const doneCount = (sessions: readonly { mark: { status: Status } | null }[]) =>
  sessions.filter((each) => each.mark !== null && each.mark.status !== "not_done").length;

/** Each picked exercise's id with its counts, every pick of every mark counted once. */
export function countPicks(marks: readonly Readonly<Record<PickKey, string | null>>[]) {
  const counts = new Map<string, PickCounts>();
  for (const mark of marks) {
    for (const pick of PICKS) {
      const id = mark[pick];
      if (id !== null) {
        const each = counts.get(id) ?? { likedBest: 0, likedLeast: 0, easiest: 0, hardest: 0 };
        each[pick] += 1;
        counts.set(id, each);
      }
    }
  }
  return counts;
}

const total = (counts: PickCounts) => PICKS.reduce((sum, pick) => sum + counts[pick], 0);

/** The exercises liked best most often first; then the most picked; then by name, in Finnish order. */
export const ranked = (exercises: readonly ExerciseCounts[]): ExerciseCounts[] =>
  [...exercises].sort(
    (a, b) =>
      b.counts.likedBest - a.counts.likedBest ||
      total(b.counts) - total(a.counts) ||
      byFinnishName(a, b)
  );
