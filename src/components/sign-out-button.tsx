"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { SIGN_OUT_BUTTON } from "@/lib/trainer/messages";

/**
 * Ends the Google session, which takes the trainer side's unlock with it, and
 * goes to sign-in. If it fails, the button works again and says so.
 * decisions/f001-trainer-side.md
 */
export function SignOutButton() {
  const router = useRouter();
  const [state, setState] = useState<"ready" | "leaving" | "failed">("ready");
  const signOut = async () => {
    setState("leaving");
    try {
      const result = await authClient.signOut();
      if (result?.error) {
        setState("failed");
        return;
      }
      router.replace(SIGN_IN_PATH);
    } catch {
      setState("failed");
    }
  };
  return (
    <>
      {state === "failed" ? (
        <p role="alert" className="mt-4 text-red-700">
          Jokin meni vikaan.
        </p>
      ) : null}
      <button
        type="button"
        disabled={state === "leaving"}
        onClick={signOut}
        className="rounded border px-4 py-2 disabled:opacity-50"
      >
        {SIGN_OUT_BUTTON}
      </button>
    </>
  );
}
