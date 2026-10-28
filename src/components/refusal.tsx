/**
 * A field's refusal, read out as an alert, or nothing when there is none.
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */
export function Refusal({ message }: Readonly<{ message: string | undefined }>) {
  return message === undefined ? null : (
    <p role="alert" className="text-red-700">
      {message}
    </p>
  );
}
