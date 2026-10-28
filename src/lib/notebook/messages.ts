/**
 * The Finnish the child's notebook view shows, as the spec gives it.
 *
 * decisions/f005-notebook-view.md
 */

/** Under a period that has not started yet. */
export const startsOn = (day: string) => `Alkaa ${day}.`;

export const EMPTY_SESSION = "Treeni on vielä tyhjä.";
export const NO_PERIOD = "Jaksoa ei ole vielä tehty.";

/** A session's line under its heading: `Kenttä · 45 min`. */
export const sessionLine = (place: string, targetMinutes: number) =>
  `${place} · ${targetMinutes} min`;
