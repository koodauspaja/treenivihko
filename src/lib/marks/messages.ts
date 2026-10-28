/**
 * The Finnish a session's mark shows, as the spec gives it.
 *
 * decisions/f006-session-marks.md
 */

export const MARK = "Merkitse";
export const CHANGE = "Muuta";
export const SKIP = "Ohita";
export const DELETE_MARK = "Poista merkintä";
export const CONFIRM_DELETE_MARK = "Poistetaanko merkintä?";

export const QUESTION = {
  status: "Teitkö treenin?",
  trainedOn: "Milloin?",
  feeling: "Miltä treeni tuntui?",
  likedBest: "Mikä oli kivoin?",
  likedLeast: "Mikä oli tylsin?",
  easiest: "Mikä oli helpoin?",
  hardest: "Mikä oli vaikein?",
} as const;

export const STATUS_CHOICE = {
  done: "Tein kaiken",
  partly: "Tein osan",
  not_done: "En tehnyt",
} as const;

export const previousHeading = (span: string) => `Edellinen jakso ${span}`;

/** A mark's line on the child's side: `Tehty 3.11.2026 😄`, `Osittain 3.11.2026`, `Ei tehty`. */
export const markLine = (status: "done" | "partly" | "not_done", day: string, emoji?: string) => {
  if (status === "not_done") {
    return "Ei tehty";
  }
  const line = `${status === "done" ? "Tehty" : "Osittain"} ${day}`;
  return emoji === undefined ? line : `${line} ${emoji}`;
};

export const REFUSAL = {
  status: "Valitse, teitkö treenin.",
  trainedOn: "Valitse päivä.",
  outOfRange: "Valitse päivä jakson alusta tähän päivään.",
  stale: "Treeni on muuttunut. Valitse uudelleen.",
} as const;
