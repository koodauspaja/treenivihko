"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { FAILED_MESSAGE } from "@/lib/auth/messages";
import { SIGN_IN_PATH, SIGNED_IN_PATH } from "@/lib/auth/paths";

/**
 * Starts Google's sign-in; a refusal comes back to the sign-in page with its
 * code. If the start itself fails, the button works again and says so.
 */
export function SignInButton() {
  const [state, setState] = useState<"ready" | "starting" | "failed">("ready");
  const start = async () => {
    setState("starting");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: SIGNED_IN_PATH,
        errorCallbackURL: SIGN_IN_PATH,
      });
      // On success the browser is already on its way to Google.
      if (result?.error) {
        setState("failed");
      }
    } catch {
      setState("failed");
    }
  };
  return (
    <>
      {state === "failed" ? (
        <p role="alert" className="mt-4 text-red-700">
          {FAILED_MESSAGE}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-6 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        disabled={state === "starting"}
        onClick={start}
      >
        Kirjaudu Google-tilillä
      </button>
    </>
  );
}
