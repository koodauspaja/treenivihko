/**
 * Days as a period counts them: a calendar date with no time, as Postgres's
 * `date` holds it, and today as it is in Finland, wherever the server runs.
 *
 * decisions/f004-periods-and-sessions.md
 */

/** A calendar date, `YYYY-MM-DD`. */
export type Day = string;

const FINNISH_TIME = "Europe/Helsinki";

const inFinland = new Intl.DateTimeFormat("en-CA", {
  timeZone: FINNISH_TIME,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Finland, which is what the parent and the child call today. */
export const today = (now: Date = new Date()): Day => inFinland.format(now);

const asUtc = (day: Day) => new Date(`${day}T00:00:00Z`);

/** `day` moved by `days`, counted on the calendar, so a change to summer time never skips one. */
export const addDays = (day: Day, days: number): Day => {
  const moved = asUtc(day);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
};

/**
 * Whether `input` is a real calendar date written `YYYY-MM-DD`, in the years
 * 1 to 9999: a month 13 is not one, nor year 0, which Postgres has no day of.
 */
export const isDay = (input: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(input) &&
  !input.startsWith("0000") &&
  !Number.isNaN(asUtc(input).getTime()) &&
  addDays(input, 0) === input;

/** A period's last day: its start plus its weeks, less a day. */
export const lastDayOf = (startsOn: Day, weeks: number): Day => addDays(startsOn, 7 * weeks - 1);

const parts = (day: Day) => day.split("-").map(Number) as [number, number, number];

/** A day as the app shows it: `3.11.2026`. */
export const formatDay = (day: Day) => {
  const [year, month, date] = parts(day);
  return `${date}.${month}.${year}`;
};

/** A span of days, the year once when both share it: `3.11.–16.11.2026`, `29.12.2026–11.1.2027`. */
export const formatSpan = (first: Day, last: Day) => {
  const [firstYear, firstMonth, firstDate] = parts(first);
  const [lastYear] = parts(last);
  return firstYear === lastYear
    ? `${firstDate}.${firstMonth}.–${formatDay(last)}`
    : `${formatDay(first)}–${formatDay(last)}`;
};

/** A period's days as the app shows them, from its start and its weeks. */
export const spanOf = ({ startsOn, weeks }: Readonly<{ startsOn: Day; weeks: number }>) =>
  formatSpan(startsOn, lastDayOf(startsOn, weeks));
