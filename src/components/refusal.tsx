/** A field's refusal, read out as an alert, or nothing when there is none. */
export function Refusal({ message }: Readonly<{ message: string | undefined }>) {
  return message === undefined ? null : (
    <p role="alert" className="text-red-700">
      {message}
    </p>
  );
}
