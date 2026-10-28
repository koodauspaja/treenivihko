/**
 * The Finnish the child's progress and the trainer side's marks show, as the
 * spec gives it.
 *
 * decisions/f007-progress.md
 */

import { PICKS, type PickKey } from "@/lib/marks/rules";

/** The progress page's heading, and its link on the child's side. */
export const PROGRESS = "Omat treenit";
export const NOT_MARKED = "Ei merkitty";
export const NO_STARTED_PERIOD = "Jaksoa ei ole vielä aloitettu.";
export const EXERCISES_HEADING = "Harjoitteet";
export const NO_PICKED_EXERCISES = "Harjoitteita ei ole vielä valittu.";

/** Each pick's name, in the marking page's order. */
export const PICK_NAME: Readonly<Record<PickKey, string>> = {
  likedBest: "Kivoin",
  likedLeast: "Tylsin",
  easiest: "Helpoin",
  hardest: "Vaikein",
};

/** A period's sessions done, in full or in part, of all of them: `Tehty 4/6`. */
export const doneLine = (done: number, total: number) => `Tehty ${done}/${total}`;

/** An exercise's counts, those of 0 left out: `Kivoin 4 · Helpoin 1 · Vaikein 2`. */
export const countsLine = (counts: Readonly<Record<PickKey, number>>) =>
  PICKS.filter((pick) => counts[pick] > 0)
    .map((pick) => `${PICK_NAME[pick]} ${counts[pick]}`)
    .join(" · ");

/** One pick of a mark on the trainer side: `Kivoin: Lähdöt`. */
export const pickLine = (pick: PickKey, name: string) => `${PICK_NAME[pick]}: ${name}`;
