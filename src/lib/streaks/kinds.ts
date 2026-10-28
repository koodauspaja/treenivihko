/**
 * The accomplishments the child can earn, by the key the database stores,
 * with no imports, so the schema and drizzle-kit can read it.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

/** The counts of sessions done that each earn one. */
export const SESSION_GOALS = [1, 10, 25, 50, 100] as const;

/** The streak lengths, in weeks, that each earn one. */
export const STREAK_GOALS = [4, 8, 12, 26] as const;

/** Every kind, in the order the spec's table lists them. */
export const KINDS = [
  "sessions_1",
  "sessions_10",
  "sessions_25",
  "sessions_50",
  "sessions_100",
  "streak_4",
  "streak_8",
  "streak_12",
  "streak_26",
  "full_period",
  "hard_to_easy",
] as const;

export type Kind = (typeof KINDS)[number];

/** The kinds earned once per period or once per exercise, whose key names which. */
export const KEYED_KINDS = ["full_period", "hard_to_easy"] as const;

export const sessionKind = (goal: (typeof SESSION_GOALS)[number]) => `sessions_${goal}` as Kind;
export const streakKind = (goal: (typeof STREAK_GOALS)[number]) => `streak_${goal}` as Kind;
