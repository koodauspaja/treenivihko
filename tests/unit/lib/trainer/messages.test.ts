import { describe, expect, it } from "vitest";
import {
  greeting,
  lockedOutMessage,
  NO_PASSWORD_SET,
  refusalMessage,
  WRONG_PASSWORD,
} from "@/lib/trainer/messages";

const NOW = new Date("2026-10-27T12:00:00.000Z");

describe("the trainer side's messages", () => {
  it("greets the child by nickname, or without one", () => {
    expect(greeting(null)).toBe("Hei!");
    expect(greeting("Testi")).toBe("Hei, Testi!");
  });

  it("says how many minutes a lockout has left", () => {
    expect(lockedOutMessage(15)).toBe("Liian monta yritystä. Yritä uudelleen 15 minuutin päästä.");
  });

  it("explains each refusal", () => {
    expect(refusalMessage({ kind: "none" }, NOW)).toBe(NO_PASSWORD_SET);
    expect(refusalMessage({ kind: "wrong" }, NOW)).toBe(WRONG_PASSWORD);
    expect(refusalMessage({ kind: "ready" }, NOW)).toBe(WRONG_PASSWORD);
    expect(
      refusalMessage({ kind: "locked", until: new Date("2026-10-27T12:14:01.000Z") }, NOW)
    ).toBe(lockedOutMessage(15));
    expect(NO_PASSWORD_SET).toBe("Valmentajan salasanaa ei ole vielä asetettu.");
    expect(WRONG_PASSWORD).toBe("Väärä salasana.");
  });
});
