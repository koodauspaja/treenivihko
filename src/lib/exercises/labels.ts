/**
 * The one list of labels an exercise can carry, in three groups. Stored by
 * key, shown by Finnish name, and each with the meaning the parent, the import
 * and the AI all label by. The database refuses a key not here; changing the
 * list is a pull request and a migration.
 *
 * decisions/f002-exercise-library.md
 */

export type LabelGroup = "skill" | "place" | "equipment";

export type Label = { key: string; group: LabelGroup; name: string; meaning: string };

export const LABELS = [
  {
    key: "dribbling",
    group: "skill",
    name: "Kuljetus",
    meaning: "The ball moves with the child: running, turning, speeding up with it close",
  },
  {
    key: "feint",
    group: "skill",
    name: "Harhautus",
    meaning: "A feint or a move to get past an opponent",
  },
  {
    key: "passing",
    group: "skill",
    name: "Syöttö",
    meaning: "The ball is played accurately to a target, a wall or a person",
  },
  {
    key: "shooting",
    group: "skill",
    name: "Laukaus",
    meaning: "A hard kick at a goal or a target",
  },
  {
    key: "ball_control",
    group: "skill",
    name: "Pallonhallinta",
    meaning: "Control in a small space: first touch, receiving, juggling",
  },
  {
    key: "footwork",
    group: "skill",
    name: "Jalkatyö",
    meaning: "A quick, rhythmic foot pattern repeated, as on the ladder",
  },
  {
    key: "speed",
    group: "skill",
    name: "Nopeus",
    meaning: "Short sprints, starts and acceleration",
  },
  {
    key: "agility",
    group: "skill",
    name: "Ketteryys",
    meaning: "Changing direction, dodging, reacting",
  },
  {
    key: "balance",
    group: "skill",
    name: "Tasapaino",
    meaning: "Holding one's body on one leg or in hard positions",
  },
  { key: "strength", group: "skill", name: "Voima", meaning: "Bodyweight strength" },
  { key: "mobility", group: "skill", name: "Liikkuvuus", meaning: "Stretching and joint mobility" },
  {
    key: "field",
    group: "place",
    name: "Kenttä",
    meaning: "Outdoors on a field: room to run and to kick hard",
  },
  {
    key: "indoors",
    group: "place",
    name: "Sisällä",
    meaning: "At home indoors: little room, no hard kicks, no jumping",
  },
  {
    key: "gym",
    group: "place",
    name: "Kuntosali",
    meaning: "The building's gym room: room to move and jump, no hard kicks",
  },
  { key: "ball", group: "equipment", name: "Pallo", meaning: "A football, or a soft ball indoors" },
  { key: "ladder", group: "equipment", name: "Tikkaat", meaning: "An agility ladder" },
  { key: "hurdles", group: "equipment", name: "Aidat", meaning: "Mini hurdles" },
  { key: "cones", group: "equipment", name: "Kartiot", meaning: "Cones or markers" },
  { key: "goal", group: "equipment", name: "Maali", meaning: "A goal, or a target marked as one" },
  {
    key: "wall",
    group: "equipment",
    name: "Seinä",
    meaning: "A wall or a rebounder to play the ball against",
  },
  { key: "jump_rope", group: "equipment", name: "Hyppynaru", meaning: "A jump rope" },
] as const satisfies readonly Label[];

export type LabelKey = (typeof LABELS)[number]["key"];

export const LABEL_KEYS: readonly LabelKey[] = LABELS.map((label) => label.key);

const byKey = new Map<string, Label>(LABELS.map((label) => [label.key, label]));

/** The label with `key`, or undefined for a key not on the list. */
export const labelOf = (key: string): Label | undefined => byKey.get(key);

/** The group's labels, in the list's order. */
export const labelsIn = (group: LabelGroup): readonly Label[] =>
  LABELS.filter((label) => label.group === group);
