/**
 * The one fixed list of labels, in three groups: stored by key, shown by
 * Finnish name, each with the meaning, in Finnish, the parent, the import and
 * the AI all label by. The database refuses a key not here.
 *
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 */

export type LabelGroup = "skill" | "place" | "equipment";

export type Label = { key: string; group: LabelGroup; name: string; meaning: string };

export const LABELS = [
  {
    key: "dribbling",
    group: "skill",
    name: "Kuljetus",
    meaning: "Pallo liikkuu lapsen mukana: juoksu, käännökset ja kiihdytykset pallo lähellä",
  },
  {
    key: "feint",
    group: "skill",
    name: "Harhautus",
    meaning: "Harhautus tai liike, jolla ohitetaan vastustaja",
  },
  {
    key: "passing",
    group: "skill",
    name: "Syöttö",
    meaning: "Pallo pelataan tarkasti kohteeseen, seinään tai toiselle",
  },
  {
    key: "shooting",
    group: "skill",
    name: "Laukaus",
    meaning: "Kova potku maaliin tai kohteeseen",
  },
  {
    key: "ball_control",
    group: "skill",
    name: "Pallonhallinta",
    meaning: "Hallinta pienessä tilassa: ensikosketus, vastaanotto, pompottelu",
  },
  {
    key: "footwork",
    group: "skill",
    name: "Jalkatyö",
    meaning: "Nopea, rytminen askelkuvio toistettuna, kuten tikkailla",
  },
  {
    key: "speed",
    group: "skill",
    name: "Nopeus",
    meaning: "Lyhyet spurtit, lähdöt ja kiihdytykset",
  },
  {
    key: "agility",
    group: "skill",
    name: "Ketteryys",
    meaning: "Suunnanmuutokset, väistöt ja reagointi",
  },
  {
    key: "balance",
    group: "skill",
    name: "Tasapaino",
    meaning: "Kehon hallinta yhdellä jalalla tai vaikeissa asennoissa",
  },
  { key: "strength", group: "skill", name: "Voima", meaning: "Lihasvoima omalla painolla" },
  {
    key: "mobility",
    group: "skill",
    name: "Liikkuvuus",
    meaning: "Venyttely ja nivelten liikkuvuus",
  },
  {
    key: "field",
    group: "place",
    name: "Kenttä",
    meaning: "Ulkona kentällä: tilaa juosta ja potkaista kovaa",
  },
  {
    key: "indoors",
    group: "place",
    name: "Sisällä",
    meaning: "Kotona sisällä: vähän tilaa, ei kovia potkuja eikä hyppyjä",
  },
  {
    key: "gym",
    group: "place",
    name: "Kuntosali",
    meaning: "Talon kuntosali: tilaa liikkua ja hypätä, ei kovia potkuja",
  },
  {
    key: "ball",
    group: "equipment",
    name: "Pallo",
    meaning: "Jalkapallo, tai sisällä pehmeä pallo",
  },
  { key: "ladder", group: "equipment", name: "Tikkaat", meaning: "Ketteryystikkaat" },
  { key: "hurdles", group: "equipment", name: "Aidat", meaning: "Pienet aidat" },
  { key: "cones", group: "equipment", name: "Kartiot", meaning: "Kartiot tai merkit" },
  { key: "goal", group: "equipment", name: "Maali", meaning: "Maali, tai maaliksi merkitty kohde" },
  {
    key: "wall",
    group: "equipment",
    name: "Seinä",
    meaning: "Seinä tai palautin, johon pallon voi pelata",
  },
  { key: "jump_rope", group: "equipment", name: "Hyppynaru", meaning: "Hyppynaru" },
] as const satisfies readonly Label[];

export type LabelKey = (typeof LABELS)[number]["key"];

export const LABEL_KEYS: readonly LabelKey[] = LABELS.map((label) => label.key);

const byKey = new Map<string, Label>(LABELS.map((label) => [label.key, label]));

/** The label with `key`, or undefined for a key not on the list. */
export const labelOf = (key: string): Label | undefined => byKey.get(key);

const names = Object.fromEntries(LABELS.map((label) => [label.key, label.name])) as Record<
  LabelKey,
  string
>;

/** The Finnish name of a key known to be on the list. */
export const nameOf = (key: LabelKey): string => names[key];

/** `keys` in the list's order, which a set read from Postgres does not keep. */
export const inListOrder = (keys: readonly string[]): LabelKey[] =>
  LABEL_KEYS.filter((key) => keys.includes(key));

/** The group's labels, in the list's order. */
export const labelsIn = (group: LabelGroup): readonly Label[] =>
  LABELS.filter((label) => label.group === group);
