import Link from "next/link";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { type LabelGroup, labelsIn } from "@/lib/exercises/labels";
import {
  EMPTY_LIBRARY,
  EQUIPMENT_FILTER,
  exerciseCount,
  GROUP_HEADING,
  LEVEL_NAMES,
  NOTHING_FITS,
  SHOW_BUTTON,
  WARM_UP_BADGE,
} from "@/lib/exercises/messages";
import {
  byFinnishName,
  EXERCISE_FILTER,
  type Filters,
  filtersFrom,
  formatAmount,
  formatDuration,
  passes,
} from "@/lib/exercises/rules";
import { listExercises } from "@/lib/exercises/store";
import { requireTrainer } from "@/lib/trainer/access";
import { EXERCISES_PATH, exercisePath } from "@/lib/trainer/paths";

type Query = Record<string, string | string[] | undefined>;

function FilterGroup({ group, filters }: Readonly<{ group: LabelGroup; filters: Filters }>) {
  const ticked = { skill: filters.skills, place: filters.places, equipment: filters.equipment }[
    group
  ];
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-semibold">
        {group === "equipment" ? EQUIPMENT_FILTER : GROUP_HEADING[group]}
      </legend>
      {labelsIn(group).map((label) => (
        <label key={label.key} className="flex items-center gap-2">
          <input
            type="checkbox"
            name={EXERCISE_FILTER[group]}
            value={label.key}
            defaultChecked={ticked.includes(label.key)}
          />
          {label.name}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The library, sorted by name and filtered by the address's query, behind
 * the unlock. decisions/f002-exercise-library.md
 */
export async function ExerciseLibrary({ query }: Readonly<{ query: Promise<Query> }>) {
  const { user, expiresAt } = await requireTrainer();
  const filters = filtersFrom(await query);
  const library = await listExercises(user.id);
  const shown = library.filter((exercise) => passes(exercise.labels, filters)).sort(byFinnishName);
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <form action={EXERCISES_PATH} method="get" className="mt-6 flex flex-col gap-4">
        <input type="hidden" name={EXERCISE_FILTER.sent} value="1" />
        <FilterGroup group="skill" filters={filters} />
        <FilterGroup group="place" filters={filters} />
        <FilterGroup group="equipment" filters={filters} />
        <button type="submit" className="self-start rounded border px-4 py-2">
          {SHOW_BUTTON}
        </button>
      </form>
      {library.length === 0 ? (
        <p className="mt-6">{EMPTY_LIBRARY}</p>
      ) : shown.length === 0 ? (
        <p className="mt-6">{NOTHING_FITS}</p>
      ) : (
        <>
          <p className="mt-6">{exerciseCount(shown.length)}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {shown.map((exercise) => (
              <li key={exercise.id}>
                <Link href={exercisePath(exercise.id)} className="underline">
                  {exercise.name}
                </Link>
                <p className="text-sm">
                  {`Taso ${LEVEL_NAMES[exercise.level]}, ${formatAmount(exercise.amountKind, exercise.amount)}, ${formatDuration(exercise.durationMinutes)}`}
                  {exercise.warmUp ? `, ${WARM_UP_BADGE}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
