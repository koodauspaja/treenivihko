/**
 * The rules that adapt a copy of the latest period to its marks: each marked
 * session's direction, each amount's step within its bounds, and the swaps
 * for the liked least and the easiest. The same marks and library always give
 * the same changes.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f009-adapted-period.md
 */

import { labelsIn } from "@/lib/exercises/labels";
import {
  type AmountKind,
  byFinnishName,
  COUNT_MAX,
  type Level,
  SECONDS_MAX,
  SECONDS_MIN,
  SECONDS_STEP,
} from "@/lib/exercises/rules";
import type { Mark } from "@/lib/marks/rules";
import { fits } from "./rules";

export type Direction = "up" | "down";

/** A library exercise as the rules read it. */
export type LibraryExercise = {
  id: string;
  name: string;
  level: Level;
  amountKind: AmountKind;
  amount: number;
  labels: readonly string[];
};

/** An exercise in a block of the latest period: the block exercise's id, and what it holds. */
export type SourceExercise = {
  id: string;
  exerciseId: string;
  amountKind: AmountKind;
  amount: number;
};

/** A session of the latest period: its exercises in block order, then position order, and its mark. */
export type SourceSession = {
  position: number;
  place: string;
  equipment: readonly string[];
  exercises: readonly SourceExercise[];
  mark: Mark | null;
};

/** What a copied block exercise holds instead of its source's. */
export type Replacement = { exerciseId: string; amountKind: AmountKind; amount: number };

/** One change, keyed by the source block exercise it changed. */
export type Change =
  | {
      kind: "amount";
      id: string;
      session: number;
      name: string;
      amountKind: AmountKind;
      from: number;
      to: number;
    }
  | {
      kind: "swap";
      id: string;
      session: number;
      from: string;
      to: string;
      amountKind: AmountKind;
      amount: number;
    };

export type Adaptation = {
  /** By the source block exercise's id; one that is not here is copied as it is. */
  replacements: ReadonlyMap<string, Replacement>;
  changes: readonly Change[];
};

const UP = 1.2;
const DOWN = 0.8;

/** A session's direction from its mark: up after it went well, down after a hard one. */
export function directionOf(mark: Mark): Direction | null {
  if (mark.status !== "done") {
    return "down";
  }
  if (mark.feeling === null || mark.feeling === 3) {
    return null;
  }
  return mark.feeling >= 4 ? "up" : "down";
}

const unitOf = (kind: AmountKind) => (kind === "count" ? 1 : SECONDS_STEP);

/**
 * An amount stepped 20% up or down: rounded to a whole count or 5 seconds,
 * moved by at least one of those, kept between half and double the library's
 * default and within Feature 002's rule, and never moved against `direction`.
 */
export function stepAmount(
  kind: AmountKind,
  amount: number,
  libraryDefault: number,
  direction: Direction
): number {
  const unit = unitOf(kind);
  const up = direction === "up";
  let next = Math.round((amount * (up ? UP : DOWN)) / unit) * unit;
  if (next === amount) {
    next = up ? amount + unit : amount - unit;
  }
  const low = Math.max(
    Math.ceil(libraryDefault / 2 / unit) * unit,
    kind === "count" ? 1 : SECONDS_MIN
  );
  const high = Math.min(
    Math.floor((libraryDefault * 2) / unit) * unit,
    kind === "count" ? COUNT_MAX : SECONDS_MAX
  );
  const bounded = Math.min(Math.max(next, low), high);
  // An amount the parent set outside the bounds stays rather than move the wrong way.
  return up ? Math.max(bounded, amount) : Math.min(bounded, amount);
}

const SKILLS: ReadonlySet<string> = new Set(labelsIn("skill").map((label) => label.key));

const sharesSkill = (a: LibraryExercise, b: LibraryExercise) =>
  a.labels.some((label) => SKILLS.has(label) && b.labels.includes(label));

/**
 * The exercise to swap `of` for: one sharing a skill, at `level`, fitting the
 * session and not in it; one not in the latest period first, then by name.
 */
function swapFor(
  of: LibraryExercise,
  level: number,
  session: SourceSession,
  inSession: ReadonlySet<string>,
  library: readonly LibraryExercise[],
  inPeriod: ReadonlySet<string>
): LibraryExercise | undefined {
  const fitting = library.filter(
    (each) =>
      each.level === level &&
      !inSession.has(each.id) &&
      sharesSkill(each, of) &&
      fits(each.labels, session.place, session.equipment)
  );
  const fresh = fitting.filter((each) => !inPeriod.has(each.id));
  return [...(fresh.length > 0 ? fresh : fitting)].sort(byFinnishName)[0];
}

type Action = { swap: number } | { step: Direction } | null;

/** What happens to one exercise of a marked session: the first of its picks decides. */
function actionOf(exerciseId: string, mark: Mark, direction: Direction | null): Action {
  const follow = direction === null ? null : { step: direction };
  if (mark.picks.likedBest === exerciseId) {
    return follow;
  }
  if (mark.picks.hardest === exerciseId) {
    return { step: "down" };
  }
  if (mark.picks.likedLeast === exerciseId) {
    return { swap: 0 };
  }
  if (mark.picks.easiest === exerciseId && direction === "up") {
    return { swap: 1 };
  }
  return follow;
}

/** The changes the latest period's marks make to its copy, session by session. */
export function adaptationOf(
  sessions: readonly SourceSession[],
  library: readonly LibraryExercise[]
): Adaptation {
  const byId = new Map(library.map((each) => [each.id, each]));
  const inPeriod = new Set(
    sessions.flatMap((session) => session.exercises.map((each) => each.exerciseId))
  );
  const replacements = new Map<string, Replacement>();
  const changes: Change[] = [];
  for (const session of sessions) {
    const { mark } = session;
    if (mark === null) {
      continue;
    }
    const direction = directionOf(mark);
    const inSession = new Set(session.exercises.map((each) => each.exerciseId));
    // One decision per exercise, so an exercise in two blocks changes the same in each.
    const swapped = new Map<string, LibraryExercise | null>();
    for (const source of session.exercises) {
      const own = byId.get(source.exerciseId) as LibraryExercise;
      const action = actionOf(source.exerciseId, mark, direction);
      if (action !== null && "swap" in action) {
        if (!swapped.has(source.exerciseId)) {
          const found = swapFor(
            own,
            own.level + action.swap,
            session,
            inSession,
            library,
            inPeriod
          );
          swapped.set(source.exerciseId, found ?? null);
          if (found !== undefined) {
            inSession.add(found.id);
          }
        }
        const found = swapped.get(source.exerciseId);
        if (found) {
          replacements.set(source.id, {
            exerciseId: found.id,
            amountKind: found.amountKind,
            amount: found.amount,
          });
          changes.push({
            kind: "swap",
            id: source.id,
            session: session.position,
            from: own.name,
            to: found.name,
            amountKind: found.amountKind,
            amount: found.amount,
          });
          continue;
        }
      }
      // With no swap found, the liked least follows the direction, and the easiest goes up.
      const step = action === null ? null : "step" in action ? action.step : (direction ?? null);
      if (step === null || source.amountKind !== own.amountKind) {
        continue;
      }
      const to = stepAmount(source.amountKind, source.amount, own.amount, step);
      if (to !== source.amount) {
        replacements.set(source.id, {
          exerciseId: source.exerciseId,
          amountKind: source.amountKind,
          amount: to,
        });
        changes.push({
          kind: "amount",
          id: source.id,
          session: session.position,
          name: own.name,
          amountKind: source.amountKind,
          from: source.amount,
          to,
        });
      }
    }
  }
  return { replacements, changes };
}
