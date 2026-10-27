import { signInErrorMessage } from "@/lib/auth/messages";

/** Why the last sign-in failed, from the address's `error`, or nothing. decisions/029-sign-in.md */
export async function SignInError({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const message = signInErrorMessage((await searchParams).error);
  return message === null ? null : (
    <p role="alert" className="mt-4 text-red-700">
      {message}
    </p>
  );
}
