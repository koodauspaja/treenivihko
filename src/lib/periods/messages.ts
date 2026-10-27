/**
 * The Finnish the periods and their sessions show, as the spec gives it.
 *
 * decisions/f004-periods-and-sessions.md
 */

export const PERIODS_HEADING = "Jaksot";
export const NEW_PERIOD = "Uusi jakso";
export const NO_PERIODS = "Jaksoja ei ole vielä.";
export const CURRENT = "Nyt menossa";
export const CREATE_PERIOD = "Luo jakso";
export const DELETE_PERIOD = "Poista jakso";
export const ADD_SESSION = "Lisää treeni";
export const NO_SESSIONS = "Jaksossa ei ole vielä treenejä.";
export const DELETE_SESSION = "Poista treeni";
export const ADD_BLOCK = "Lisää osio";
export const NO_BLOCKS = "Treenissä ei ole vielä osioita.";
export const DELETE_BLOCK = "Poista osio";
export const ADD_EXERCISE = "Lisää harjoite";
export const NO_BLOCK_EXERCISES = "Osiossa ei ole vielä harjoitteita.";
export const ADD = "Lisää";
export const UP = "Ylös";
export const DOWN = "Alas";
export const SAVE = "Tallenna";
export const SAVED = "Tallennettu.";
export const DOES_NOT_FIT = "Ei sovi paikkaan tai välineisiin.";
export const NOTHING_FITS = "Yksikään harjoite ei sovi tämän treenin paikkaan ja välineisiin.";

export const FIELD = {
  startsOn: "Alkaa",
  weeks: "Kesto",
  place: "Paikka",
  equipment: "Välineet käytössä",
  target: "Tavoitekesto (min)",
  theme: "Osio",
} as const;

/** A period's length: `1 viikko`, `2 viikkoa`. */
export const weeksLabel = (weeks: number) => (weeks === 1 ? "1 viikko" : `${weeks} viikkoa`);

/** How many sessions a period has. */
export const sessionCount = (count: number) => {
  if (count === 0) {
    return "ei treenejä";
  }
  return count === 1 ? "1 treeni" : `${count} treeniä`;
};

export const periodHeading = (span: string) => `Jakso ${span}`;
export const sessionHeading = (position: number) => `Treeni ${position}`;
export const copiedFrom = (span: string) => `Uusi jakso alkaa kopiona jaksosta ${span}.`;
export const STARTS_EMPTY = "Uusi jakso alkaa tyhjänä.";
export const confirmDeletePeriod = (span: string) => `Poistetaanko jakso ${span} ja sen treenit?`;
export const confirmDeleteSession = (position: number) => `Poistetaanko treeni ${position}?`;
export const confirmDeleteBlock = (theme: string) => `Poistetaanko osio ${theme}?`;
export const pickerHeading = (theme: string) => `Lisää harjoite osioon ${theme}`;

/** A session's line on its period: `Kenttä, 40 / 45 min`. */
export const sessionLine = (place: string, total: number, target: number) =>
  `${place}, ${total} / ${target} min`;

/** A session's length against its target. */
export const lengthLine = (total: number, target: number) =>
  `Yhteensä ${total} min, tavoite ${target} min`;

export const overTarget = (minutes: number) => `Yli tavoitteen ${minutes} min.`;

/** What the picker filters by: `Paikka: Kenttä. Välineet: Pallo, Kartiot.` */
export const pickerFilters = (place: string, equipment: readonly string[]) =>
  `Paikka: ${place}. Välineet: ${equipment.length === 0 ? "ei välineitä" : equipment.join(", ")}.`;

export const REFUSAL = {
  startsOn: "Anna alkamispäivä.",
  weeks: "Valitse kesto.",
  theme: "Osion nimessä on oltava 1–30 merkkiä.",
  target: "Tavoitekeston on oltava 5–120 minuuttia, 5 minuutin välein.",
  place: "Valitse paikka.",
  sessions: "Jaksossa voi olla enintään 20 treeniä.",
  blocks: "Treenissä voi olla enintään 6 osiota.",
  blockExercises: "Osiossa voi olla enintään 10 harjoitetta.",
} as const;

export const overlapsWith = (span: string) => `Jakso menee päällekkäin jakson ${span} kanssa.`;

/** Why a library exercise cannot be deleted: the periods it is in. */
export const exerciseInUse = (spans: readonly string[]) =>
  `Harjoite on käytössä jaksoissa: ${spans.join(", ")}. Poista se ensin niiden treeneistä.`;
