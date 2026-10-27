import { requireUser } from "@/lib/auth/session";

/**
 * The child's side, where sign-in lands: a placeholder until its feature. It
 * shows nothing of the parent's, and only to a signed-in browser.
 */
export async function SignedInPanel() {
  await requireUser();
  return <p className="mt-4">Treenit tulevat tänne pian.</p>;
}
