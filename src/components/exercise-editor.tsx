import { notFound } from "next/navigation";
import { DeleteExercise } from "@/components/delete-exercise";
import { ExerciseForm } from "@/components/exercise-form";
import { TrainerTimeout } from "@/components/trainer-timeout";
import { VideoLink } from "@/components/video-link";
import { EMPTY_VALUES, valuesFrom } from "@/lib/exercises/rules";
import { getExercise } from "@/lib/exercises/store";
import { requireTrainer } from "@/lib/trainer/access";

/** A new exercise's form, behind the unlock. decisions/f002-exercise-library.md */
export async function NewExercise() {
  const { expiresAt } = await requireTrainer();
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <ExerciseForm initialValues={EMPTY_VALUES} />
    </>
  );
}

/**
 * One of the parent's exercises: its name, its video, its form and its
 * deletion. Another parent's, or one that is gone, is not found.
 * decisions/f002-exercise-library.md
 */
export async function ExistingExercise({ id }: Readonly<{ id: Promise<string> }>) {
  const { user, expiresAt } = await requireTrainer();
  const exercise = await getExercise(user.id, await id);
  if (exercise === null) {
    notFound();
  }
  return (
    <>
      <TrainerTimeout expiresAt={expiresAt.toISOString()} />
      <h1 className="text-3xl font-bold">{exercise.name}</h1>
      <VideoLink url={exercise.videoUrl} />
      <ExerciseForm exerciseId={exercise.id} initialValues={valuesFrom(exercise)} />
      <div className="mt-8">
        <DeleteExercise id={exercise.id} name={exercise.name} />
      </div>
    </>
  );
}
