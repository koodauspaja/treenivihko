/**
 * The Finnish the exercise import shows, as the spec gives it, and the prompt
 * for an AI tool, which names exactly the labels the import accepts.
 *
 * decisions/f003-exercise-import.md
 */

import { type LabelGroup, labelsIn } from "./labels";

export const IMPORT_HEADING = "Tuo harjoitteita";
export const IMPORT_LINK = "Tuo harjoitteita";
export const IMPORT_INTRODUCTION =
  "Lisää monta harjoitetta kerralla JSON-tiedostosta tai tekoälytyökalun vastauksesta. Jokainen harjoite tarkistetaan ensin, ja jos yksikin ei kelpaa, mitään ei tallenneta.";
export const PROMPT_HEADING = "Ohje tekoälylle";
export const PROMPT_INTRODUCTION =
  "Kopioi tämä ohje tekoälytyökaluun ja kerro perään, millaisia harjoitteita haluat.";
export const COPY_PROMPT = "Kopioi ohje";
export const COPIED = "Kopioitu.";
export const COPY_FAILED = "Kopiointi ei onnistunut. Valitse teksti ja kopioi se itse.";
export const FORM_HEADING = "Tuonti";
export const FILE_FIELD = "Tiedosto (.json)";
export const NO_FILE = "Ei valittua tiedostoa.";
export const TEXT_FIELD = "Tai liitä teksti";
export const IMPORT_BUTTON = "Tuo";

/** After an import, how many it saved. */
export const imported = (count: number) =>
  count === 1 ? "Tuotu 1 harjoite." : `Tuotu ${count} harjoitetta.`;

/** Why the whole import was refused, by the reason its log line names. */
export const IMPORT_REFUSAL = {
  empty: "Valitse tiedosto tai liitä teksti.",
  both: "Valitse tiedosto tai liitä teksti, ei molempia.",
  size: "Tuonti on liian suuri: enintään 500 kt.",
  encoding: "Tiedoston on oltava UTF-8-tekstiä.",
  json: "Tämä ei ole JSON-muotoa.",
  shape: "Tuonnissa on oltava lista harjoitteita: [ … ].",
  none: "Tuonnissa ei ole yhtään harjoitetta.",
  count: "Tuonnissa saa olla enintään 100 harjoitetta.",
} as const;

export type ImportRefusal = keyof typeof IMPORT_REFUSAL;

export const NAME_SAVED_MEANWHILE =
  "Kirjastoon tallennettiin samanniminen harjoite tuonnin aikana. Mitään ei tallennettu; tuo uudelleen.";

/** Above the failing exercises: how many fail. */
export const failingCount = (count: number) =>
  count === 1
    ? "1 harjoite ei kelpaa. Mitään ei tallennettu."
    : `${count} harjoitetta ei kelpaa. Mitään ei tallennettu.`;

/** A failing exercise's heading, by its position from 1 and its name when it has one. */
export const failingHeading = (position: number, name: string | null) =>
  name === null ? `Harjoite ${position}` : `Harjoite ${position}: ${name}`;

/** The reasons an exercise fails that Feature 002's form never meets. */
export const EXERCISE_REASON = {
  notObject: "Harjoite ei ole oikeaa muotoa.",
  amount: "Anna joko kertaa tai sekuntia, ei molempia.",
  warmUp: "Lämmittelyn on oltava true tai false.",
  nameEarlier: "Sama nimi on jo aiemmin tuonnissa.",
} as const;

export const unknownField = (field: string) => `Tuntematon kenttä: ${field}.`;

const LIST_NAME: Record<LabelGroup, string> = {
  skill: "Taidot",
  place: "Paikat",
  equipment: "Välineet",
};

export const notAList = (group: LabelGroup) => `${LIST_NAME[group]} on annettava listana.`;

const UNKNOWN_LABEL: Record<LabelGroup, string> = {
  skill: "Tuntematon taito",
  place: "Tuntematon paikka",
  equipment: "Tuntematon väline",
};

export const unknownLabel = (group: LabelGroup, name: string) =>
  `${UNKNOWN_LABEL[group]}: ${name}.`;

const labelLines = (group: LabelGroup) =>
  labelsIn(group)
    .map((label) => `- ${label.name}: ${label.meaning}`)
    .join("\n");

/** The prompt to copy into an AI tool, exactly as the spec words it. */
export const IMPORT_PROMPT = `Tee jalkapallo- ja liikuntaharjoitteita lapselle, joka harjoittelee yksin. Vastaa pelkällä JSON-listalla, ilman muuta tekstiä ennen tai jälkeen. Listassa saa olla enintään 100 harjoitetta. Jokainen harjoite on olio, jossa on vain nämä kentät:

- "nimi": lyhyt, helposti muistettava ja kirjoitettava nimi, 1–40 merkkiä. Jokaisella harjoitteella on eri nimi.
- "ohje": miten harjoite tehdään, 1–1000 merkkiä.
- "videolinkki": https-osoite, enintään 500 merkkiä, tai null.
- joko "kertaa": toistojen määrä, kokonaisluku 1–100, tai "sekuntia": aika, kokonaisluku 5–600, 5 sekunnin välein. Ei molempia.
- "kesto_min": kesto minuutteina, kokonaisluku 1–30.
- "taso": 1 (helppo), 2 (keskitaso) tai 3 (vaikea).
- "lammittely": true, jos harjoite sopii lämmittelyyn, muuten false.
- "taidot": lista, jossa on vähintään yksi alla olevista taidoista.
- "paikat": lista, jossa on vähintään yksi alla olevista paikoista.
- "valineet": lista harjoitteen tarvitsemista välineistä alla olevista, tai tyhjä lista.

Käytä taitojen, paikkojen ja välineiden nimiä täsmälleen näin:

Taidot:
${labelLines("skill")}

Paikat:
${labelLines("place")}

Välineet:
${labelLines("equipment")}`;
