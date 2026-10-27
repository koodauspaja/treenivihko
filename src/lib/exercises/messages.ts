/**
 * The Finnish the exercise library shows, as the spec gives it.
 * decisions/f002-exercise-library.md
 */

export const LIBRARY_HEADING = "Harjoitteet";
export const NEW_EXERCISE = "Uusi harjoite";
export const SHOW_BUTTON = "Näytä";
export const EMPTY_LIBRARY = "Kirjastossa ei ole vielä harjoitteita.";
export const NOTHING_FITS = "Yksikään harjoite ei sovi valintoihin.";
export const WARM_UP_BADGE = "Lämmittely";
export const WATCH_VIDEO = "Katso video";

export const FIELD = {
  name: "Nimi",
  instructions: "Ohje",
  videoUrl: "Videolinkki",
  amount: "Määrä",
  count: "Kertaa",
  time: "Aika",
  times: "Kertoja",
  seconds: "Sekuntia",
  duration: "Kesto (min)",
  level: "Taso",
  warmUp: "Sopii lämmittelyyn",
} as const;

export const GROUP_HEADING = { skill: "Taito", place: "Paikka", equipment: "Välineet" } as const;
export const EQUIPMENT_FILTER = "Välineet käytössä";

export const LEVEL_NAMES = { 1: "Helppo", 2: "Keskitaso", 3: "Vaikea" } as const;

export const SAVE = "Tallenna";
export const SAVED = "Tallennettu.";
export const added = (name: string) => `Lisätty: ${name}.`;
export const DELETE_EXERCISE = "Poista harjoite";
export const confirmDelete = (name: string) => `Poistetaanko harjoite ${name}?`;
export const DELETE = "Poista";
export const CANCEL = "Peruuta";

export const REFUSAL = {
  name: "Nimessä on oltava 1–40 merkkiä.",
  nameInUse: "Samanniminen harjoite on jo kirjastossa.",
  instructions: "Ohjeessa on oltava 1–1000 merkkiä.",
  videoUrl: "Videolinkin on oltava https-osoite.",
  count: "Kertoja on oltava 1–100.",
  time: "Ajan on oltava 5 s – 10 min, 5 sekunnin välein.",
  duration: "Keston on oltava 1–30 minuuttia.",
  level: "Valitse taso.",
  skill: "Valitse vähintään yksi taito.",
  place: "Valitse vähintään yksi paikka.",
} as const;

/** How many exercises the list shows. */
export const exerciseCount = (count: number) =>
  count === 1 ? "1 harjoite" : `${count} harjoitetta`;
