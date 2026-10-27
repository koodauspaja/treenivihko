import { UnlockForm } from "@/components/unlock-form";
import { requireUser } from "@/lib/auth/session";
import { refusalMessage } from "@/lib/trainer/messages";
import { passwordState } from "@/lib/trainer/store";

/** The password form, or why there is none: no password yet, or a lockout. decisions/f001-trainer-side.md */
export async function LockPanel() {
  const user = await requireUser();
  const now = new Date();
  const state = await passwordState(user.id, now);
  return state.kind === "ready" ? (
    <UnlockForm />
  ) : (
    <p role="alert" className="mt-6">
      {refusalMessage(state, now)}
    </p>
  );
}
