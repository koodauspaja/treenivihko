import { describe, expect, it } from "vitest";
import {
  isLockedOut,
  LOCKOUT_ATTEMPTS,
  LOCKOUT_MINUTES,
  lockoutEnd,
  minutesLeft,
  nicknameFrom,
  passwordRefusal,
  UNLOCK_MINUTES,
  unlockExpiry,
} from "@/lib/trainer/rules";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-10-27T12:00:00.000Z");

describe("passwordRefusal", () => {
  it.each([
    [7, "a password is 8 to 128 characters"],
    [8, null],
    [128, null],
    [129, "a password is 8 to 128 characters"],
  ])("a password of %i characters: %s", (length, expected) => {
    const password = "x".repeat(length);
    expect(passwordRefusal(password, password)).toBe(expected);
  });

  it("counts an emoji as one character", () => {
    expect(passwordRefusal("😀".repeat(4), "😀".repeat(4))).toBe(
      "a password is 8 to 128 characters"
    );
    expect(passwordRefusal("😀".repeat(8), "😀".repeat(8))).toBeNull();
  });

  it("refuses two passwords that differ", () => {
    expect(passwordRefusal("long enough", "long enougH")).toBe("the two passwords differ");
  });
});

describe("nicknameFrom", () => {
  it.each([
    ["", null],
    ["   ", null],
    ["A", "A"],
    ["  Testi  ", "Testi"],
    ["x".repeat(20), "x".repeat(20)],
    [` ${"x".repeat(20)} `, "x".repeat(20)],
    ["x".repeat(21), null],
  ])("%j becomes %j", (input, expected) => {
    expect(nicknameFrom(input)).toBe(expected);
  });

  it("counts characters as a person does, and stores one form of each", () => {
    const decomposed = "A\u0308ija\u0308".repeat(5);
    expect(nicknameFrom(decomposed)).toBe("Äijä".repeat(5));
    expect(nicknameFrom(`${decomposed}x`)).toBeNull();
  });

  it("refuses U+0000, which Postgres cannot store, and a lone surrogate, which it would replace", () => {
    expect(nicknameFrom("Ab\u0000")).toBeNull();
    expect(nicknameFrom("Ab\ud800")).toBeNull();
  });

  it("refuses what is not text", () => {
    expect(nicknameFrom(null)).toBeNull();
    expect(nicknameFrom(new File([], "x"))).toBeNull();
  });
});

describe("the lockout and the unlock", () => {
  it("locks after 5 wrong passwords, for 15 minutes, and unlocks for 15", () => {
    expect(LOCKOUT_ATTEMPTS).toBe(5);
    expect(LOCKOUT_MINUTES).toBe(15);
    expect(UNLOCK_MINUTES).toBe(15);
    expect(lockoutEnd(NOW)).toEqual(at("2026-10-27T12:15:00.000Z"));
    expect(unlockExpiry(NOW)).toEqual(at("2026-10-27T12:15:00.000Z"));
  });

  it("is locked until the end, and not at it", () => {
    expect(isLockedOut(null, NOW)).toBe(false);
    expect(isLockedOut(at("2026-10-27T12:00:00.001Z"), NOW)).toBe(true);
    expect(isLockedOut(NOW, NOW)).toBe(false);
  });

  it.each([
    ["15:00", "2026-10-27T12:15:00.000Z", 15],
    ["14:01", "2026-10-27T12:14:01.000Z", 15],
    ["14:00", "2026-10-27T12:14:00.000Z", 14],
    ["0:01", "2026-10-27T12:00:01.000Z", 1],
  ])("with %s left, says %i minutes", (_left, until, minutes) => {
    expect(minutesLeft(at(until), NOW)).toBe(minutes);
  });

  it("never says 0 minutes", () => {
    expect(minutesLeft(NOW, NOW)).toBe(1);
  });
});
