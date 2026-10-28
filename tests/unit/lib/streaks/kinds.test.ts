import { describe, expect, it } from "vitest";
import {
  KEYED_KINDS,
  KINDS,
  SESSION_GOALS,
  STREAK_GOALS,
  sessionKind,
  streakKind,
} from "@/lib/streaks/kinds";

describe("the accomplishments' kinds", () => {
  it("are every goal's kind, then the two earned once per period or exercise, in that order", () => {
    expect(KINDS).toEqual([
      ...SESSION_GOALS.map(sessionKind),
      ...STREAK_GOALS.map(streakKind),
      ...KEYED_KINDS,
    ]);
    expect(sessionKind(25)).toBe("sessions_25");
    expect(streakKind(8)).toBe("streak_8");
  });
});
