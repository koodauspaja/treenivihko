/**
 * A period's days at the Finnish clock's turns: midnight, a year's end and
 * the start of summer time.
 *
 * decisions/f004-periods-and-sessions.md
 */

import { describe, expect, it, vi } from "vitest";
import {
  addDays,
  formatDay,
  formatSpan,
  isDay,
  lastDayOf,
  spanOf,
  today,
} from "@/lib/periods/dates";

describe("today", () => {
  it("is the day in Finland, wherever the server runs", () => {
    // 22.30 UTC is already the next day in Helsinki, in winter (UTC+2) and in summer (UTC+3).
    expect(today(new Date("2026-11-02T22:30:00Z"))).toBe("2026-11-03");
    expect(today(new Date("2026-11-02T21:59:00Z"))).toBe("2026-11-02");
    expect(today(new Date("2026-06-30T21:30:00Z"))).toBe("2026-07-01");
    expect(today(new Date("2026-06-30T20:59:00Z"))).toBe("2026-06-30");
  });

  it("turns the year at Finnish midnight", () => {
    expect(today(new Date("2026-12-31T21:59:00Z"))).toBe("2026-12-31");
    expect(today(new Date("2026-12-31T22:00:00Z"))).toBe("2027-01-01");
  });

  it("goes to the next day across the night summer time starts", () => {
    // Finland's clocks go forward at 01.00 UTC on 29 March 2026.
    expect(today(new Date("2026-03-28T21:59:00Z"))).toBe("2026-03-28");
    expect(today(new Date("2026-03-28T22:00:00Z"))).toBe("2026-03-29");
    expect(today(new Date("2026-03-29T20:59:00Z"))).toBe("2026-03-29");
    expect(today(new Date("2026-03-29T21:00:00Z"))).toBe("2026-03-30");
  });

  it("reads the clock when given no time", () => {
    vi.useFakeTimers({ now: new Date("2026-11-02T22:30:00Z") });
    try {
      expect(today()).toBe("2026-11-03");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("addDays", () => {
  it("counts calendar days, across a month, a year, a leap day and summer time", () => {
    expect(addDays("2026-11-03", 13)).toBe("2026-11-16");
    expect(addDays("2026-12-29", 13)).toBe("2027-01-11");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-11-03", -3)).toBe("2026-10-31");
  });
});

describe("isDay", () => {
  it("takes a real date written YYYY-MM-DD", () => {
    expect(isDay("2026-11-03")).toBe(true);
    expect(isDay("2028-02-29")).toBe(true);
  });

  it("refuses anything else", () => {
    for (const input of ["", "2026-02-30", "2027-02-29", "2026-13-01", "2026-1-3", "3.11.2026"]) {
      expect(isDay(input)).toBe(false);
    }
    expect(isDay("0000-01-01")).toBe(false);
    expect(isDay("0001-01-01")).toBe(true);
    expect(isDay("+010000-01-01")).toBe(false);
    expect(isDay("2026-11-03x")).toBe(false);
    expect(isDay(" 2026-11-03")).toBe(false);
  });
});

describe("lastDayOf", () => {
  it("is the start plus the weeks, less a day", () => {
    expect(lastDayOf("2026-11-03", 2)).toBe("2026-11-16");
    expect(lastDayOf("2026-11-03", 1)).toBe("2026-11-09");
    expect(lastDayOf("2026-12-29", 2)).toBe("2027-01-11");
  });
});

describe("formatting", () => {
  it("shows a day without leading zeros", () => {
    expect(formatDay("2026-11-03")).toBe("3.11.2026");
    expect(formatDay("0026-11-03")).toBe("3.11.0026");
    expect(formatDay("0001-01-01")).toBe("1.1.0001");
  });

  it("shows a span's year once, or both across a year", () => {
    expect(formatSpan("2026-11-03", "2026-11-16")).toBe("3.11.–16.11.2026");
    expect(formatSpan("2026-12-29", "2027-01-11")).toBe("29.12.2026–11.1.2027");
  });
});

describe("spanOf", () => {
  it("shows a period's days from its start and weeks", () => {
    expect(spanOf({ startsOn: "2026-11-03", weeks: 2 })).toBe("3.11.–16.11.2026");
    expect(spanOf({ startsOn: "2026-12-29", weeks: 1 })).toBe("29.12.2026–4.1.2027");
  });
});
